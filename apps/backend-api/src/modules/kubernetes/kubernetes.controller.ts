import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { KubernetesService } from './kubernetes.service'

@ApiTags('Kubernetes')
@ApiBearerAuth()
@Controller('kubernetes')
export class KubernetesController {
  constructor(private readonly service: KubernetesService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Kubernetes platform overview' })
  overview() {
    return this.service.getOverview()
  }

  @Get('clusters')
  clusters() {
    return this.service.getClusters()
  }

  @Get('nodes')
  nodes() {
    return this.service.getNodes()
  }

  @Get('namespaces')
  namespaces() {
    return this.service.getNamespaces()
  }

  @Get('pods')
  pods(@Query('namespace') namespace?: string) {
    return this.service.getPods(namespace)
  }

  @Get('deployments')
  deployments(@Query('namespace') namespace?: string) {
    return this.service.getDeployments(namespace)
  }

  @Get('services')
  services(@Query('namespace') namespace?: string) {
    return this.service.getServices(namespace)
  }

  @Get('events')
  events() {
    return this.service.getEvents()
  }

  @Get('metrics')
  metrics() {
    return this.service.getMetrics()
  }
}
