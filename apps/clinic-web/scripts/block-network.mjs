import { Socket } from 'node:net'

// Preload this only for the synthetic API integration test process.
const originalConnect = Socket.prototype.connect
Socket.prototype.connect = function (...args) {
  const target = args[0]
  if (typeof target === 'string' && !/^\d+$/.test(target)) {
    return originalConnect.apply(this, args)
  }
  if (typeof target === 'object' && target !== null && 'path' in target) {
    return originalConnect.apply(this, args)
  }
  throw new Error('Acceptance blocks TCP connections')
}

globalThis.fetch = async () => {
  throw new Error('Acceptance blocks fetch requests')
}
