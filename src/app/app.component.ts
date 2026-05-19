import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { LocationTrackingService } from './services/location-tracking.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html', // Volte para o original
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private locationTracking: LocationTrackingService) {
    this.locationTracking.resumeIfAllowed();
  }
}
