export const prefix = `http://${window.location.hostname}:3000`;

export default function(uri: string, payload?: Parameters<typeof fetch>[1]) {
  return fetch(`${prefix}${uri}`, payload).then(res => res.json());
}