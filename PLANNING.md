# Services Planning

## Service Implementation Checklist

### api-gateway
- [x] Main router setup
- [x] JWT validation middleware
- [x] Request routing to services
- [x] Error handling
- [x] Logging middleware
- [x] Health check endpoint

### auth-service
- [x] User model and repository
- [x] JWT token generation
- [x] User login endpoint
- [ ] User registration (optional)
- [x] Role assignment
- [x] Token refresh endpoint

### order-service
- [x] Order model and repository
- [x] Order item model and repository
- [x] Create order endpoint
- [x] Add item endpoint
- [x] Remove item endpoint
- [x] View order endpoint
- [x] List orders endpoint
- [x] Change order status endpoint

### payment-service
- [x] Payment model and repository
- [x] Payment method model
- [x] Order discount model
- [x] Checkout endpoint (calls promotion-service)
- [x] Payment creation
- [x] Payment status endpoint
- [x] Idempotency handling

### promotion-service
- [x] Promotion model and repository
- [x] Promotion validation logic
- [x] Discount calculation
- [x] Evaluate promotion endpoint
- [x] Apply promotion endpoint
- [x] Usage counter management

### database
- [x] PostgreSQL schema
- [x] Migration scripts
- [x] Sample data (seeding)

### kubernetes
- [x] Deployment manifests for each service
- [x] Service manifests
- [x] ConfigMaps for environment variables
- [x] Secrets for credentials
- [x] PostgreSQL StatefulSet

### Local Dev
- [x] Dockerfile for each service
- [ ] docker-compose.yml (optional)
- [x] Tiltfile
- [x] Environment setup (.env example)

---

## Key Decisions for This Phase

| Decision | Status | Reason |
|----------|--------|--------|
| One PostgreSQL database | ✓ Decided | Simplicity; can split later |
| REST/HTTP for service calls | ✓ Decided | Easy debugging; works at this scale |
| JWT for auth | ✓ Decided | Stateless; works with Kubernetes |
| No caching layer yet | ✓ Decided | Add when needed (Redis) |
| No async messaging yet | ✓ Decided | Add when order volume requires |
| Docker + Kubernetes | ✓ Decided | Future-proof; works locally with Tilt |

---

## Estimated Implementation Order

1. **Database schema** (STEP 2) - Everything depends on this
2. **Auth service** - Needed for JWT tokens
3. **Order service** - Core business logic
4. **Promotion service** - Referenced during checkout
5. **Payment service** - Depends on order + promotion
6. **API gateway** - Wires everything together
7. **Docker & Kubernetes** - For deployment
8. **Tilt** - For local development

---

## Success Criteria

- [ ] Can create an order via QR code client
- [ ] Can add multiple items to order
- [ ] Can checkout order with promotion code
- [ ] Can process payment
- [ ] Can view order history
- [ ] All services run in Docker locally
- [ ] All services orchestrated with Tilt
- [ ] JWT authentication works end-to-end
