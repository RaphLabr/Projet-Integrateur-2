// Disabling lint to access private methods
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { CreationCharacterService } from '@app/services/creation-character-service/creation-character.service';
import { SnackBarService } from '@app/services/snack-bar-service/snack-bar.service';
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { of } from 'rxjs';
import { CreationCharacterComponent } from './creation-character.component';

describe('CreationCharacterComponent', () => {
    let component: CreationCharacterComponent;
    let fixture: ComponentFixture<CreationCharacterComponent>;
    let mockCreationCharacterService: jasmine.SpyObj<CreationCharacterService>;
    let mockActivatedRoute: { paramMap: any; queryParamMap?: any };
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
    let snackBarServiceMock: jasmine.SpyObj<SnackBarService>;

    beforeEach(() => {
        mockCreationCharacterService = jasmine.createSpyObj('CreationCharacterService', [
            'postPlayer',
            'mapAvailableChecker',
            'getGameId',
            'onSubmit',
            'connect',
            'joinCreatingRoom',
            'onCharacterSelect',
            'disconnect',
        ]);

        mockCreationCharacterService.availableCharacters$ = of([]);

        mockActivatedRoute = {
            paramMap: of({
                get: jasmine.createSpy('get').and.returnValue('1'),
            }),
            queryParamMap: of({
                get: jasmine.createSpy('get').and.returnValue('classic'),
            }),
        };

        const mockSnackBarRef = jasmine.createSpyObj('MatSnackBarRef', ['onAction', 'dismiss']);
        mockSnackBarRef.onAction.and.returnValue(of(undefined));
        mockSnackBarRef.dismiss.and.stub();
        mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
        mockSnackBar.open.and.returnValue(mockSnackBarRef);

        TestBed.configureTestingModule({
            imports: [CreationCharacterComponent],
            providers: [
                { provide: CreationCharacterService, useValue: mockCreationCharacterService },
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
                { provide: MatSnackBar, useValue: mockSnackBar },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreationCharacterComponent);
        component = fixture.componentInstance;
        snackBarServiceMock = TestBed.inject(SnackBarService) as jasmine.SpyObj<SnackBarService>;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set mapId from route param', () => {
        component.ngOnInit();
        expect(mockCreationCharacterService.mapId).toBe('1');
    });

    it('should call showNotification if ID is not found in route', () => {
        const snackBarServiceMockSpy = spyOn(snackBarServiceMock, 'showNotification');
        component['_route'] = {
            paramMap: of({
                get: () => null,
            }),
            queryParamMap: of({
                get: () => 'classic',
            }),
        } as any;
        component.ngOnInit();
        expect(snackBarServiceMockSpy).toHaveBeenCalledWith('ID du jeu non trouvé dans les paramètres de la route', true);
    });
    it('should call onSubmit with correct parameters', () => {
        component.selectedCharacterId = CharacterType.Character1;
        component.characterName = 'Test Character';
        component.selectedBonus = 'Bonus1';
        component.selectedDice = DiceChoice.FourDefence;

        component.onSubmit();

        expect(mockCreationCharacterService.onSubmit).toHaveBeenCalledWith(
            CharacterType.Character1,
            'Test Character',
            'Bonus1',
            DiceChoice.FourDefence,
        );
    });

    it('should call onCharacterSelect with correct character', () => {
        const character: CharacterType = CharacterType.Character1;
        component.onCharacterSelect(character);
        expect(mockCreationCharacterService.onCharacterSelect).toHaveBeenCalledWith(character);
    });
    it('should set joining to true when history state contains joining', () => {
        spyOnProperty(history, 'state', 'get').and.returnValue({ joining: true });
        component.ngOnInit();
        expect(mockCreationCharacterService.joining).toBeTrue();
    });

    it('should call connect and joinCreatingRoom when joining', () => {
        spyOnProperty(history, 'state', 'get').and.returnValue({ joining: true });
        component.ngOnInit();
        expect(mockCreationCharacterService.connect).toHaveBeenCalled();
        expect(mockCreationCharacterService.joinCreatingRoom).toHaveBeenCalled();
    });

    it('should set gameId when joining and id is present in route params', () => {
        spyOnProperty(history, 'state', 'get').and.returnValue({ joining: true });
        mockCreationCharacterService.gameId = '';
        mockCreationCharacterService.joining = true;
        component.ngOnInit();
        expect(mockCreationCharacterService.gameId).toBe('1');
    });

    it('should set mapId when not joining and id is present in route params', () => {
        spyOnProperty(history, 'state', 'get').and.returnValue({ joining: false });
        mockCreationCharacterService.gameId = '';
        mockCreationCharacterService.joining = false;
        component.ngOnInit();
        expect(mockCreationCharacterService.mapId).toBe('1');
    });

    describe('isCharacterAvailable', () => {
        it('should return true when character is in availableCharacters array', () => {
            component.availableCharacters = [CharacterType.Character1, CharacterType.Character3];
            component.selectedCharacterId = CharacterType.Character4;

            expect(component.isCharacterAvailable(CharacterType.Character1)).toBeTrue();
            expect(component.isCharacterAvailable(CharacterType.Character3)).toBeTrue();
        });

        it('should return true when character is the selected character', () => {
            component.availableCharacters = [CharacterType.Character1, CharacterType.Character3];
            component.selectedCharacterId = CharacterType.Character4;

            expect(component.isCharacterAvailable(CharacterType.Character4)).toBeTrue();
        });

        it('should return false when character is neither available nor selected', () => {
            component.availableCharacters = [CharacterType.Character1, CharacterType.Character3];
            component.selectedCharacterId = CharacterType.Character4;

            expect(component.isCharacterAvailable(CharacterType.Character2)).toBeFalse();
            expect(component.isCharacterAvailable(CharacterType.Character5)).toBeFalse();
        });
    });
});
