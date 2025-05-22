import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MapModel } from '@app/models/map-model';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class CreationPageService {
    readonly url = environment.serverUrl;
    constructor(private _http: HttpClient) {}

    fetchData(): Observable<MapModel[]> {
        return this._http.get<MapModel[]>(this.url + '/api/map').pipe(
            map((response) => response.filter((item) => item.visibility)),
            catchError(() => {
                return of();
            }),
        );
    }
}
