type Listener<T> = (event: T) => void;

export class PubSub<T> {
  private listeners = new Set<Listener<T>>();

  subscribe(listener: Listener<T>) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: T) {
    for (const l of this.listeners) l(event);
  }
}
