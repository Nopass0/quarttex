export interface DeviceAware {
  deviceId?: string | null;
}

export const isWithoutDevice = (tx: DeviceAware): boolean => tx.deviceId == null;
