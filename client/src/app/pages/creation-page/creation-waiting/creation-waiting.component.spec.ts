import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ActivatedRoute } from '@angular/router';
import { ChatRoomService } from '@app/services/chat-room-service/chat-room.service';
import { CreationWaitingService } from '@app/services/creation-waiting-service/creation-waiting.service';
import { CharacterType } from '@common/character-type';
import { DiceChoice } from '@common/dice-choice';
import { BehaviorSubject, of } from 'rxjs';
import { CreationWaitingComponent } from './creation-waiting.component';

describe('CreationWaitingComponent', () => {
    let component: CreationWaitingComponent;
    let fixture: ComponentFixture<CreationWaitingComponent>;
    let creationWaitingServiceSpy: jasmine.SpyObj<CreationWaitingService>;
    const mapSize = 20;

    const mockChatRoomService = {
        _messagesSubject: new BehaviorSubject<string[]>(['message1', 'message2']),
        messages$: new BehaviorSubject<string[]>(['message1', 'message2']).asObservable(),
        messages: ['message1', 'message2'],
        sendMessage: jasmine.createSpy('sendMessage'),
        initialize: jasmine.createSpy('initialize'),
        getChatHistory: jasmine.createSpy('getChatHistory'),
        configureBaseSocketFeatures: jasmine.createSpy('configureBaseSocketFeatures'),
    };

    const creationWaitingServiceMock = jasmine.createSpyObj('CreationWaitingService', [
        'connect',
        'disconnect',
        'startGame',
        'onTogglePublic',
        'onKickUser',
        'getSize',
        'sendMessage',
        'addAi',
    ]);

    beforeEach(async () => {
        creationWaitingServiceMock.users = [];
        creationWaitingServiceMock.socketId = 'mock-socket-id';
        creationWaitingServiceMock.gameId = 'mock-game-id';
        creationWaitingServiceMock.admin = true;
        creationWaitingServiceMock.isAdmin = true;
        creationWaitingServiceMock.isLocked = false;
        creationWaitingServiceMock.maxPlayers = false;
        creationWaitingServiceMock.joining = false;
        creationWaitingServiceMock.mapId = 'mock-map-id';
        creationWaitingServiceMock.clientPlayer = {
            userId: '1',
            characterId: CharacterType.Character1,
            name: 'c1',
            bonus: '',
            dice: DiceChoice.FourDefence,
            admin: false,
        };
        creationWaitingServiceMock.chatRoomService = mockChatRoomService;
        creationWaitingServiceMock.getSize.and.returnValue(of(mapSize));

        await TestBed.configureTestingModule({
            imports: [CreationWaitingComponent, FormsModule, MatButtonModule, MatIconModule, MatSlideToggleModule],
            providers: [
                provideHttpClient(),
                { provide: CreationWaitingService, useValue: creationWaitingServiceMock },
                { provide: ChatRoomService, useValue: mockChatRoomService },
                { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => 'test-game-id' }) } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreationWaitingComponent);
        component = fixture.componentInstance;
        creationWaitingServiceSpy = TestBed.inject(CreationWaitingService) as jasmine.SpyObj<CreationWaitingService>;
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call onTogglePublic on service when onTogglePublic is called', () => {
        component.onTogglePublic();
        expect(creationWaitingServiceSpy.onTogglePublic).toHaveBeenCalled();
    });

    it('should call onKickUser on service when onKickUser is called', () => {
        const userId = 'user-id';
        component.onKickUser(userId);
        expect(creationWaitingServiceSpy.onKickUser).toHaveBeenCalledWith(userId);
    });

    it('should call startGame on service when startGame is called', () => {
        component.startGame();
        expect(creationWaitingServiceSpy.startGame).toHaveBeenCalled();
    });

    it('should set gameId from route param', () => {
        expect(component.gameId).toBe('test-game-id');
    });

    it('should call getSize and connect on ngOnInit if not joining', () => {
        expect(creationWaitingServiceSpy.getSize).toHaveBeenCalled();
        expect(creationWaitingServiceSpy.connect).toHaveBeenCalled();
    });

    it('should populate users if history.state.playerInfo exists', () => {
        spyOnProperty(history, 'state').and.returnValue({
            playerInfo: { name: 'Player1', id: 2, userId: 'u2' },
            map: 'map-id',
            joining: true,
        });

        component.ngOnInit();

        expect(creationWaitingServiceSpy.users).toContain(
            jasmine.objectContaining({
                name: 'Player1',
                character: 2,
                id: 'u2',
            }),
        );
    });

    it('should return socketId from creationWaitingService', () => {
        expect(component.socketId).toBe('mock-socket-id');
    });

    it('should call isLocked setter with correct value', () => {
        const spy = spyOnProperty(component, 'isLocked', 'set');

        component.isLocked = true;

        expect(spy).toHaveBeenCalledWith(true);
    });

    it('should update creationWaitingService isLocked when setter is called', () => {
        component.isLocked = true;
        expect(creationWaitingServiceSpy.isLocked).toBeTrue();
    });

    it('should return isLocked from creationWaitingService', () => {
        creationWaitingServiceSpy.isLocked = true;
        expect(component.isLocked).toBeTrue();

        creationWaitingServiceSpy.isLocked = false;
        expect(component.isLocked).toBeFalse();
    });

    it('should return maxPlayers from creationWaitingService', () => {
        creationWaitingServiceSpy.isGameFull = true;
        expect(component.isGameFull).toBeTrue();

        creationWaitingServiceSpy.isGameFull = false;
        expect(component.isGameFull).toBeFalse();
    });
    it('should toggle botChoiceVisibility when toggleBotChoice is called', () => {
        const initialValue = component.botChoiceVisibility;

        component.toggleBotChoice();
        expect(component.botChoiceVisibility).toBe(!initialValue);

        component.toggleBotChoice();
        expect(component.botChoiceVisibility).toBe(initialValue);
    });

    it('should toggle bot choice visibility, set typeInput, and call addAi on service', () => {
        spyOn(component, 'toggleBotChoice').and.callThrough();
        component.toggleState = false;

        component.addAi();

        expect(component.toggleBotChoice).toHaveBeenCalled();
        expect(component.typeInput).toBe('aggressive');
        expect(creationWaitingServiceSpy.addAi).toHaveBeenCalledWith('aggressive');
    });

    it('should set typeInput to defensive when toggleState is true', () => {
        spyOn(component, 'toggleBotChoice').and.callThrough();
        Object.defineProperty(component, 'toggleState', { get: () => true });

        component.addAi();

        expect(component.typeInput).toBe('defensive');
        expect(creationWaitingServiceSpy.addAi).toHaveBeenCalledWith('defensive');
    });
});
