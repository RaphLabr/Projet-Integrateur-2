import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JoiningPageService } from '@app/services/joining-page-service/joining-page.service';

@Component({
    selector: 'app-joining-page',
    imports: [FormsModule],
    templateUrl: './joining-page.component.html',
    styleUrls: ['./joining-page.component.scss', '../../global-css/global.scss'],
})
export class JoiningPageComponent {
    lobbyId: string;
    constructor(private _joiningPageService: JoiningPageService) {}
    onSubmit(): void {
        this._joiningPageService.lobbyId = this.lobbyId;
        this._joiningPageService.onSubmit();
    }
}
