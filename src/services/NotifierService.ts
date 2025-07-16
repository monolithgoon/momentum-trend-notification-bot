// src/services/notifier/NotifierService.ts

interface Notifier {
  send(message: string): Promise<void>;
}

/**
 * Service class for managing and dispatching notifications through multiple notifiers.
 *
 * The `NotifierService` allows you to send a message to all registered notifiers at once.
 * Notifiers can be provided during instantiation or dynamically added later using the `addNotifier` method.
 *
 * @example
 * ```typescript
 * const emailNotifier = new EmailNotifier();
 * const smsNotifier = new SMSNotifier();
 * const notifierService = new NotifierService(emailNotifier, smsNotifier);
 * await notifierService.notify("Hello, world!");
 * ```
 *
 * @remarks
 * - The `notify` method sends the provided message to all registered notifiers in parallel.
 * - The `addNotifier` method can be used to add additional notifiers after the service has been instantiated.
 */
export class NotifierService {
  private notifiers: Notifier[] = [];

  constructor(...notifiers: Notifier[]) {
    this.notifiers = notifiers;
  }

  async notify(message: string): Promise<void> {
    await Promise.all(this.notifiers.map((notifier) => notifier.send(message)));
  }

  /**
   * Adds a new notifier to the service after instantiation.
   * This method does not get invoked automatically; 
   * call it manually to register additional notifiers.
   */
  addNotifier(notifier: Notifier): void {
    this.notifiers.push(notifier);
  }
}
