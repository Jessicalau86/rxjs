import {Operator} from './Operator';
import {Observer} from './Observer';
import {Observable} from './Observable';
import {Subscriber} from './Subscriber';
import {ISubscription, Subscription} from './Subscription';
import {ObjectUnsubscribedError} from './util/ObjectUnsubscribedError';
import {SubjectSubscription} from './SubjectSubscription';

/**
 * @class Subject<T>
 */
export class Subject<T> extends Observable<T> implements ISubscription {
  observers: Observer<T>[] = [];

  isUnsubscribed = false;

  isStopped = false;

  hasError = false;

  thrownError: any = null;

  constructor() {
    super();
  }

  static create: Function = <T>(destination: Observer<T>, source: Observable<T>): AnonymousSubject<T> => {
    return new AnonymousSubject<T>(destination, source);
  };

  lift<T, R>(operator: Operator<T, R>): Observable<T> {
    const subject = new AnonymousSubject(this, this);
    subject.operator = operator;
    return <any>subject;
  }

  next(value: T) {
    if (this.isUnsubscribed) {
      throw new ObjectUnsubscribedError();
    }
    if (!this.isStopped) {
      const { observers } = this;
      const len = observers.length;
      const copy = observers.slice();
      for (let i = 0; i < len; i++) {
        copy[i].next(value);
      }
    }
  }

  error(err: any) {
    if (this.isUnsubscribed) {
      throw new ObjectUnsubscribedError();
    }
    if (!this.isStopped) {
      this.hasError = true;
      this.thrownError = err;
      this.isStopped = true;
      const { observers } = this;
      const len = observers.length;
      const copy = observers.slice();
      for (let i = 0; i < len; i++) {
        copy[i].error(err);
      }
      this.observers.length = 0;
    }
  }

  complete() {
    if (this.isUnsubscribed) {
      throw new ObjectUnsubscribedError();
    }
    if (!this.isStopped) {
      this.isStopped = true;
      const { observers } = this;
      const len = observers.length;
      const copy = observers.slice();
      for (let i = 0; i < len; i++) {
        copy[i].complete();
      }
      this.observers.length = 0;
    }
  }

  unsubscribe() {
    this.isStopped = true;
    this.isUnsubscribed = true;
    this.observers = null;
  }

  _subscribe(subscriber: Subscriber<T>): Subscription {
    if (this.isUnsubscribed) {
      throw new ObjectUnsubscribedError();
    } else if (this.hasError) {
      subscriber.error(this.thrownError);
      return Subscription.EMPTY;
    } else if (this.isStopped) {
      subscriber.complete();
      return Subscription.EMPTY;
    } else {
      this.observers.push(subscriber);
      return new SubjectSubscription(this, subscriber);
    }
  }

  asObservable(): Observable<T> {
    const observable = new Observable<T>();
    (<any>observable).source = this; //HACKITY HACK
    return observable;
  }
}

/**
 * @class AnonymousSubject<T>
 */
export class AnonymousSubject<T> extends Subject<T> {
  constructor(protected destination?: Observer<T>, protected source?: Observable<T>) {
    super();
  }

  next(value: T) {
    this.destination.next(value);
  }

  error(err: any) {
    this.destination.error(err);
  }

  complete() {
    this.destination.complete();
  }

  _subscribe(subscriber: Subscriber<T>): Subscription {
    const { source } = this;
    if (source) {
      return this.source.subscribe(subscriber);
    } else {
      return Subscription.EMPTY;
    }
  }
}
