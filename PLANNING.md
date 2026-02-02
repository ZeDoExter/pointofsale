# Services Planning

## Service Implementation Checklist

### api-gateway
- [ ] Main router setup
- [ ] JWT validation middleware
- [ ] Request routing to services
- [ ] Error handling
- [ ] Logging middleware
- [ ] Health check endpoint

### auth-service
- [ ] User model and repository
- [ ] JWT token generation
- [ ] User login endpoint
- [ ] User registration (optional)
- [ ] Role assignment
- [ ] Token refresh endpoint

### order-service
- [ ] Order model and repository
- [ ] Order item model and repository
- [ ] Create order endpoint
- [ ] Add item endpoint
- [ ] Remove item endpoint
- [ ] View order endpoint
- [ ] List orders endpoint
- [ ] Change order status endpoint

### payment-service
- [ ] Payment model and repository
- [ ] Payment method model
- [ ] Order discount model
- [ ] Checkout endpoint (calls promotion-service)
- [ ] Payment creation
- [ ] Payment status endpoint
- [ ] Idempotency handling

### promotion-service
- [ ] Promotion model and repository
- [ ] Promotion validation logic
- [ ] Discount calculation
- [ ] Evaluate promotion endpoint
- [ ] Apply promotion endpoint
- [ ] Usage counter management

### database
- [ ] PostgreSQL schema
- [ ] Migration scripts
- [ ] Sample data (seeding)

### kubernetes
- [ ] Deployment manifests for each service
- [ ] Service manifests
- [ ] ConfigMaps for environment variables
- [ ] Secrets for credentials
- [ ] PostgreSQL StatefulSet

### Local Dev
- [ ] Dockerfile for each service
- [ ] docker-compose.yml (optional)
- [ ] Tiltfile
- [ ] Environment setup (.env example)

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
