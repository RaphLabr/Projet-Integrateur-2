import { provideHttpClient } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Routes, provideRouter, withHashLocation } from '@angular/router';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { AppComponent } from '@app/pages/app/app.component';
import { CreationCharacterComponent } from '@app/pages/creation-page/creation-character/creation-character.component';
import { CreationPageComponent } from '@app/pages/creation-page/creation-page/creation-page.component';
import { CreationWaitingComponent } from '@app/pages/creation-page/creation-waiting/creation-waiting.component';
import { EditionPageComponent } from '@app/pages/edition-page/edition-page.component';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { GameStatisticsPageComponent } from '@app/pages/game-statistics-page/game-statistics-page.component';
import { JoiningPageComponent } from '@app/pages/joining-page/joining-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'admin', component: AdminPageComponent },
    { path: 'joining', component: JoiningPageComponent },
    { path: 'home', component: MainPageComponent },
    { path: 'edition', component: EditionPageComponent },
    { path: 'creation', component: CreationPageComponent },
    { path: 'game/:id', component: GamePageComponent },
    { path: 'creation/creation-character/:id', component: CreationCharacterComponent },
    { path: 'creation/creation-waiting/:id', component: CreationWaitingComponent },
    { path: 'statistics/:id', component: GameStatisticsPageComponent },
    { path: '**', redirectTo: '/home' },
];

bootstrapApplication(AppComponent, {
    providers: [provideHttpClient(), provideRouter(routes, withHashLocation()), provideAnimations()],
});
