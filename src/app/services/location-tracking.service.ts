import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastController } from '@ionic/angular';

interface TokenPayload {
  id?: number;
  nome?: string;
  email?: string;
  perfil?: string;
  geolocalizacaoConsentida?: boolean;
  exp?: number;
}

type LocationSource = 'watch' | 'manual' | 'ip';

interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  source: LocationSource;
  capturedAt: string;
}

export interface LocationSyncResult {
  capturedAt: string;
  synced: boolean;
  queued: boolean;
}

@Injectable({ providedIn: 'root' })
export class LocationTrackingService {
  private watchId: number | null = null;
  private ipIntervalId: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private lastSentAt = 0;

  private readonly API_URL = 'http://localhost:9090/user';
  private readonly QUEUE_KEY = 'locationTrackingQueue';
  private readonly MIN_INTERVAL_MS = 15000;
  private readonly IP_INTERVAL_MS = 60000;

  constructor(
    private http: HttpClient,
    private toastCtrl: ToastController
  ) {
    window.addEventListener('online', () => this.flushQueue());
    window.addEventListener('beforeunload', () => this.stopTracking(false));
  }

  resumeIfAllowed() {
    const token = localStorage.getItem('token');
    if (token) this.startTrackingFromToken(token);
  }

  startTrackingFromToken(token: string) {
    const payload = this.decodeToken(token);
    if (!payload || !this.canTrack(payload)) return;

    if (!navigator.geolocation) {
      this.showTrackingWarning('Este navegador nao suporta GPS/geolocalizacao.');
      this.startIpTracking();
      return;
    }

    this.stopWatchingOnly();
    this.stopIpTracking();
    this.flushQueue();
    void this.requestCurrentPosition('watch', false).catch(() => this.startIpTracking());

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleLocationError(error, false),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );
  }

  requestIpPosition(showWarnings: boolean = true): Promise<LocationSyncResult> {
    return this.captureIpPayload()
      .then((payload) => this.sendLocation(payload).then((synced) => ({
        capturedAt: payload.capturedAt,
        synced,
        queued: !synced
      })))
      .catch((error) => {
        if (showWarnings) {
          this.showTrackingWarning(error instanceof Error
            ? error.message
            : 'Nao foi possivel capturar localizacao por IP.');
        }
        throw error;
      });
  }

  requestCurrentPosition(
    source: LocationSource = 'manual',
    showWarnings: boolean = true
  ): Promise<LocationSyncResult> {
    if (!navigator.geolocation) {
      const message = 'Este navegador nao suporta GPS/geolocalizacao.';
      if (showWarnings) this.showTrackingWarning(message);
      return Promise.reject(new Error(message));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const payload = this.buildPayload(position, source);
          this.lastSentAt = Date.now();
          if (source !== 'ip') this.stopIpTracking();
          this.sendLocation(payload).then((synced) => {
            resolve({
              capturedAt: payload.capturedAt,
              synced,
              queued: !synced
            });
          });
        },
        (error) => {
          this.handleLocationError(error, showWarnings);
          reject(new Error(this.getLocationErrorMessage(error)));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    });
  }

  private buildPayload(position: GeolocationPosition, source: LocationSource): LocationPayload {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      source,
      capturedAt: new Date(position.timestamp || Date.now()).toISOString()
    };
  }

  private handleLocationError(error: GeolocationPositionError, showWarning: boolean = true) {
    const message = this.getLocationErrorMessage(error);

    if (error.code === error.PERMISSION_DENIED) {
      this.stopWatchingOnly();
    }
    this.startIpTracking();

    if (showWarning) {
      this.showTrackingWarning(message);
    }
  }

  private getLocationErrorMessage(error: GeolocationPositionError): string {
    if (error.code === error.PERMISSION_DENIED) {
      return 'GPS bloqueado. Permita a localizacao no navegador para rastrear este queijo.';
    }

    if (error.code === error.POSITION_UNAVAILABLE) {
      return 'Nao foi possivel obter a localizacao do queijo agora.';
    }

    if (error.code === error.TIMEOUT) {
      return 'Tempo esgotado ao tentar obter a localizacao do queijo.';
    }

    return 'Nao foi possivel capturar a localizacao do queijo.';
  }

  private handlePosition(position: GeolocationPosition, force: boolean = false) {
    const now = Date.now();
    if (!force && now - this.lastSentAt < this.MIN_INTERVAL_MS) return;

    this.lastSentAt = now;
    this.stopIpTracking();
    this.sendLocation(this.buildPayload(position, 'watch'));
  }

  private async captureIpPayload(): Promise<LocationPayload> {
    const response = await fetch('https://api.ipwho.org/me');
    if (!response.ok) throw new Error('Nao foi possivel consultar localizacao por IP.');

    const data = await response.json();
    const latitude = Number(data.latitude ?? data.lat);
    const longitude = Number(data.longitude ?? data.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('A localizacao por IP nao retornou coordenadas validas.');
    }

    return {
      latitude,
      longitude,
      accuracy: null,
      source: 'ip',
      capturedAt: new Date().toISOString()
    };
  }

  private startIpTracking() {
    if (this.ipIntervalId) return;

    void this.requestIpPosition(false).catch(() => {});
    this.ipIntervalId = setInterval(() => {
      void this.requestIpPosition(false).catch(() => {});
    }, this.IP_INTERVAL_MS);
  }

  stopTracking(notifyServer: boolean = true) {
    this.stopWatchingOnly();
    this.stopIpTracking();

    if (!notifyServer) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.post(`${this.API_URL}/location/stop`, {}, { headers: this.getHeaders(token) })
      .subscribe({ error: () => {} });
  }

  getLastSync(): string | null {
    return localStorage.getItem('lastLocationTrackingSync');
  }

  getQueuedCount(): number {
    return this.getQueue().length;
  }

  private stopWatchingOnly() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private stopIpTracking() {
    if (this.ipIntervalId) {
      clearInterval(this.ipIntervalId);
      this.ipIntervalId = null;
    }
  }

  private sendLocation(payload: LocationPayload): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (!token) {
      this.queueLocation(payload);
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      this.http.post(`${this.API_URL}/location/update`, payload, { headers: this.getHeaders(token) })
        .subscribe({
          next: () => {
            localStorage.setItem('lastLocationTrackingSync', new Date().toISOString());
            resolve(true);
          },
          error: () => {
            this.queueLocation(payload);
            resolve(false);
          }
        });
    });
  }

  private flushQueue() {
    if (this.isFlushing || !navigator.onLine) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isFlushing = true;
    const [next, ...rest] = queue;

    this.http.post(`${this.API_URL}/location/update`, next, { headers: this.getHeaders(token) })
      .subscribe({
        next: () => {
          localStorage.setItem(this.QUEUE_KEY, JSON.stringify(rest));
          localStorage.setItem('lastLocationTrackingSync', new Date().toISOString());
          this.isFlushing = false;
          this.flushQueue();
        },
        error: () => {
          this.isFlushing = false;
        }
      });
  }

  private queueLocation(payload: LocationPayload) {
    const queue = this.getQueue();
    queue.push(payload);
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue.slice(-100)));
  }

  private getQueue(): LocationPayload[] {
    try {
      const raw = localStorage.getItem(this.QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private canTrack(payload: TokenPayload): boolean {
    const perfil = String(payload.perfil ?? '').toLowerCase();
    const exp = payload.exp ?? 0;
    const isExpired = exp > 0 && exp < Math.floor(Date.now() / 1000);

    return payload.geolocalizacaoConsentida === true && perfil !== 'admin' && !isExpired;
  }

  private decodeToken(token: string): TokenPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  private async showTrackingWarning(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      color: 'warning',
      position: 'bottom'
    });
    await toast.present();
  }
}
