import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CHARACTERS } from '@app/constants/characters';
import { CreationCharacterService } from '@app/services/creation-character-service/creation-character.service';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { SocketClientService } from '@app/services/socket-client-service/socket-client.service';
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';

@Component({
    selector: 'app-creation-character',
    standalone: true,
    imports: [MatRadioModule, MatButtonModule, MatButtonToggleModule, MatSelectModule, RouterModule, MatButtonModule, FormsModule],
    templateUrl: './creation-character.component.html',
    styleUrls: ['../../../global-css/global.scss', './creation-character.component.scss'],
    providers: [SocketClientService],
})
export class CreationCharacterComponent implements OnInit, OnDestroy {
    readonly characters: CharacterType[] = CHARACTERS;
    availableCharacters: CharacterType[] = this.characters;
    selectedCharacterId: CharacterType;
    characterName: string;
    selectedBonus: string;
    selectedDice: DiceChoice;

    constructor(
        private _route: ActivatedRoute,
        private _creationCharacterService: CreationCharacterService,
        private _snackBarService: SnackBarService,
    ) {}

    ngOnInit(): void {
        if (history.state && history.state.joining) {
            this._creationCharacterService.joining = true;
        }

        this._route.paramMap.subscribe((params) => {
            const id = params.get('id');
            let mode;
            this._route.queryParamMap.subscribe((queryParams) => {
                mode = queryParams.get('mode');
            });

            if (id) {
                if (this._creationCharacterService.joining) {
                    this._creationCharacterService.gameId = String(id);
                } else {
                    this._creationCharacterService.mapId = String(id);
                    this._creationCharacterService.mode = String(mode);
                }
            } else {
                this._snackBarService.showNotification('ID du jeu non trouvé dans les paramètres de la route', true);
            }
        });

        this._creationCharacterService.connect();

        if (this._creationCharacterService.joining) {
            this._creationCharacterService.joinCreatingRoom();
            this._creationCharacterService.availableCharacters$.subscribe((availableCharacters) => {
                this.availableCharacters = availableCharacters;
            });
        }
    }

    isCharacterAvailable(character: CharacterType): boolean {
        return this.availableCharacters.includes(character) || this.selectedCharacterId === character;
    }

    onCharacterSelect(character: CharacterType): void {
        this._creationCharacterService.onCharacterSelect(character);
    }

    onSubmit(): void {
        this._creationCharacterService.onSubmit(this.selectedCharacterId, this.characterName, this.selectedBonus, this.selectedDice);
    }

    ngOnDestroy(): void {
        this._creationCharacterService.joining = false;
        this._creationCharacterService.disconnect();
    }
}
