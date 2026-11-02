/**
 * Payload's delete access check distinguishes reversible trash actions from
 * permanent deletion using the incoming data object. For a soft delete,
 * data.deletedAt is a timestamp; for restoration, it can be null.
 * Permanent deletion passes no data.
 *
 * Only the service's explicitly trusted Local API can bypass collection
 * access. Authenticated editors must never be offered an irreversible purge.
 */
export function canTrashPost({
  user,
  data,
}: {
  user: unknown
  data: unknown
}): boolean {
  return Boolean(
    user &&
    data &&
    typeof data === 'object' &&
    Object.prototype.hasOwnProperty.call(data, 'deletedAt'),
  )
}
