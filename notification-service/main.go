package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

type Client struct {
	conn       *websocket.Conn
	send       chan []byte
	branchID   string
	orgID      string
	role       string
	disconnect chan bool
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

type Event struct {
	Type         string                 `json:"type"`
	Data         map[string]interface{} `json:"data"`
	BranchID     string                 `json:"branch_id,omitempty"`
	OrgID        string                 `json:"organization_id,omitempty"`
	Timestamp    time.Time              `json:"timestamp"`
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("Client registered: branch=%s, org=%s, role=%s", client.branchID, client.orgID, client.role)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mutex.Unlock()
			log.Printf("Client unregistered: branch=%s", client.branchID)

		case message := <-h.broadcast:
			var event Event
			if err := json.Unmarshal(message, &event); err != nil {
				log.Printf("Failed to unmarshal event: %v", err)
				continue
			}

			h.mutex.RLock()
			for client := range h.clients {
				// Filter by branch/org based on role
				if shouldReceiveEvent(client, &event) {
					select {
					case client.send <- message:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func shouldReceiveEvent(client *Client, event *Event) bool {
	// ADMIN sees everything
	if client.role == "ADMIN" {
		return true
	}

	// MANAGER sees their organization
	if client.role == "MANAGER" && client.orgID != "" {
		return event.OrgID == client.orgID || event.OrgID == ""
	}

	// CASHIER sees their branch
	if client.branchID != "" {
		return event.BranchID == client.branchID || event.BranchID == ""
	}

	return false
}

func (c *Client) readPump() {
	defer func() {
		c.disconnect <- true
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8086"
	}

	hub := newHub()
	go hub.run()

	router := mux.NewRouter()

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}).Methods(http.MethodGet)

	// WebSocket endpoint for clients
	router.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWS(hub, w, r)
	}).Methods(http.MethodGet)

	// HTTP endpoint for publishing events (called by other services)
	router.HandleFunc("/api/events", func(w http.ResponseWriter, r *http.Request) {
		publishEvent(hub, w, r)
	}).Methods(http.MethodPost)

	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: router,
	}

	go func() {
		sigch := make(chan os.Signal, 1)
		signal.Notify(sigch, syscall.SIGTERM, syscall.SIGINT)
		<-sigch
		server.Shutdown(context.Background())
	}()

	log.Printf("Notification service on port %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

func serveWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	// Extract auth info from query params (in production, use JWT)
	branchID := r.URL.Query().Get("branch_id")
	orgID := r.URL.Query().Get("organization_id")
	role := r.URL.Query().Get("role")

	if role == "" {
		role = "GUEST"
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := &Client{
		conn:       conn,
		send:       make(chan []byte, 256),
		branchID:   branchID,
		orgID:      orgID,
		role:       role,
		disconnect: make(chan bool),
	}

	hub.register <- client

	// Send welcome message
	welcome := Event{
		Type:      "connected",
		Data:      map[string]interface{}{"message": "Connected to notification service"},
		Timestamp: time.Now(),
	}
	welcomeJSON, _ := json.Marshal(welcome)
	client.send <- welcomeJSON

	go client.writePump()
	go client.readPump()

	<-client.disconnect
	hub.unregister <- client
}

func publishEvent(hub *Hub, w http.ResponseWriter, r *http.Request) {
	var event Event
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	event.Timestamp = time.Now()
	message, err := json.Marshal(event)
	if err != nil {
		http.Error(w, "Failed to encode event", http.StatusInternalServerError)
		return
	}

	hub.broadcast <- message

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "published"})
}
