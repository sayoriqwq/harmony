import type { PackageIdType as PackageId } from '@harmony/semantic-model/schema/ids'
import type { SemanticKernelIdentity } from '@harmony/semantic-model/schema/package'
import { Context, Layer } from 'effect'
import { defaultSemanticKernelIdentity } from './constants.ts'

export class SemanticKernel extends Context.Service<SemanticKernel, {
  readonly identity: SemanticKernelIdentity
}>()('harmony/headless-runtime/SemanticKernel') {
  static layerFromIdentity(identity: SemanticKernelIdentity) {
    return Layer.succeed(
      SemanticKernel,
      SemanticKernel.of({ identity }),
    )
  }

  static readonly layerDefault = this.layerFromIdentity(defaultSemanticKernelIdentity)
}

export class BaseSemanticLayer extends Context.Service<BaseSemanticLayer, {
  readonly packageId: PackageId
}>()('harmony/headless-runtime/BaseSemanticLayer') {
  static layerFromPackageId(packageId: PackageId) {
    return Layer.succeed(
      BaseSemanticLayer,
      BaseSemanticLayer.of({ packageId }),
    )
  }
}
