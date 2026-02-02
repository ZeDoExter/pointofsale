docker_compose('docker-compose.yml')

dc_resource('postgres', labels=['database'])
dc_resource('api-gateway', labels=['gateway'])
dc_resource('auth-service', labels=['services'])
dc_resource('order-service', labels=['services'])
dc_resource('promotion-service', labels=['services'])
dc_resource('payment-service', labels=['services'])

local_resource(
    'go-mod-tidy',
    cmd='cd api-gateway && go mod tidy; cd ../auth-service && go mod tidy; cd ../order-service && go mod tidy; cd ../promotion-service && go mod tidy; cd ../payment-service && go mod tidy',
    labels=['setup']
)
