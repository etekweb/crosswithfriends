/**
 * Mock implementations for User store
 */
import EventEmitter from '../../store/EventEmitter';

export class MockUser extends EventEmitter {
  attached: boolean;
  color: string;
  fb: any;
  id: string | null;

  constructor() {
    super();
    this.attached = true;
    this.color = '#6aa9f4';
    this.fb = null;
    this.id = 'test-user-id';
  }

  attach(): void {
    this.attached = true;
    this.emit('auth');
  }

  logIn(): void {
    this.fb = {
      uid: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com',
    };
    this.emit('auth');
  }

  get refPath(): string | null {
    if (!this.id) return null;
    return `user/${this.id}`;
  }
}

export function createMockUser(): MockUser {
  return new MockUser();
}
