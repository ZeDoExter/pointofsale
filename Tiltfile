docker_build('pointofsale-api-gateway', 'api-gateway')
docker_build('pointofsale-auth-service', 'auth-service')
docker_build('pointofsale-order-service', 'order-service')
docker_build('pointofsale-promotion-service', 'promotion-service')
docker_build('pointofsale-payment-service', 'payment-service')
docker_build('pointofsale-notification-service', 'notification-service')
docker_build('pointofsale-frontend', 'frontend')

k8s_yaml('kubernetes/configmaps.yaml')
k8s_yaml('kubernetes/pos.yaml')

k8s_resource('postgres', labels=['database'])
k8s_resource('api-gateway', port_forwards=8080, labels=['gateway'])
k8s_resource('frontend', port_forwards=30080, labels=['frontend'])
k8s_resource('auth-service', labels=['services'])
k8s_resource('order-service', labels=['services'])
k8s_resource('promotion-service', labels=['services'])
k8s_resource('payment-service', labels=['services'])
k8s_resource('notification-service', labels=['services'])

local_resource(
    'go-mod-tidy',
    cmd='cd api-gateway && go mod tidy; cd ../auth-service && go mod tidy; cd ../order-service && go mod tidy; cd ../promotion-service && go mod tidy; cd ../payment-service && go mod tidy; cd ../notification-service && go mod tidy',
    labels=['setup']
)
