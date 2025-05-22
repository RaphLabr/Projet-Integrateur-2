// the following disable is to access the private attribute messageBox
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ChatRoomService } from '@app/services/chat-room-service/chat-room.service';
import { GENERAL_BUFFER } from '@common/timer-constants';
import { BehaviorSubject } from 'rxjs';
import { ChatBoxComponent } from './chat-box.component';

describe('ChatBoxComponent', () => {
    let component: ChatBoxComponent;
    let fixture: ComponentFixture<ChatBoxComponent>;
    let mockChatRoomService: jasmine.SpyObj<ChatRoomService>;
    let messagesSubject: BehaviorSubject<string[]>;

    const mockMessages = ['Hello', 'World', 'Test message'];
    const mockGameId = 'game123';
    const mockPlayerName = 'TestPlayer';

    beforeEach(async () => {
        messagesSubject = new BehaviorSubject<string[]>(mockMessages);

        mockChatRoomService = jasmine.createSpyObj('ChatRoomService', ['sendMessage'], {
            messages$: messagesSubject.asObservable(),
            get messages() {
                return mockMessages;
            },
        });

        await TestBed.configureTestingModule({
            imports: [FormsModule, ChatBoxComponent],
            providers: [{ provide: ChatRoomService, useValue: mockChatRoomService }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ChatBoxComponent);
        component = fixture.componentInstance;

        component.playerName = mockPlayerName;
        component.gameId = mockGameId;

        (component as any).messageBox = {
            nativeElement: {
                scrollTop: 0,
                clientHeight: 100,
                scrollHeight: 200,
                scrollTo: jasmine.createSpy('scrollTo'),
            },
        };

        spyOn(component, 'scrollToBottom').and.callThrough();

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('getters', () => {
        it('should get messagesObservable from chatRoomService', () => {
            expect(component.messagesObservable).toEqual(messagesSubject.asObservable());
        });

        it('should get messages from chatRoomService', () => {
            expect(component.messages).toEqual(mockMessages);
        });
    });

    describe('lifecycle methods', () => {
        it('should call scrollToBottom in ngAfterViewInit', () => {
            component.ngAfterViewInit();
            expect(component.scrollToBottom).toHaveBeenCalled();
        });

        it('should setup subscription in ngAfterViewInit', () => {
            (component.scrollToBottom as jasmine.Spy).calls.reset();

            component.ngAfterViewInit();

            const newMessages = [...mockMessages, 'New message'];
            messagesSubject.next(newMessages);

            expect(component.scrollToBottom).toHaveBeenCalledTimes(1);
            messagesSubject.next([...newMessages, 'Another message']);
        });

        it('should call scrollToBottom with timeout when user is at bottom', fakeAsync(() => {
            (component.scrollToBottom as jasmine.Spy).calls.reset();
            component.ngAfterViewInit();

            expect(component.scrollToBottom).toHaveBeenCalledTimes(1);

            messagesSubject.next([...mockMessages, 'New message']);

            tick(GENERAL_BUFFER);

            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(component.scrollToBottom).toHaveBeenCalledTimes(4);
        }));

        it('should unsubscribe on ngOnDestroy', () => {
            const unsubscribeSpy = jasmine.createSpy('unsubscribe');
            (component as any)._messagesSubscription = { unsubscribe: unsubscribeSpy };

            component.ngOnDestroy();
            expect(unsubscribeSpy).toHaveBeenCalled();
        });
    });

    describe('user interactions', () => {
        it('should send message, clear input, and scroll to bottom', () => {
            const testMessage = 'Hello world';
            component.messageInput = testMessage;

            component.sendMessage();

            expect(mockChatRoomService.sendMessage).toHaveBeenCalledWith(testMessage, mockGameId);
            expect(component.messageInput).toBe('');
            expect(component.scrollToBottom).toHaveBeenCalled();
        });
    });

    describe('utility methods', () => {
        it('should scroll to bottom', () => {
            const mockScrollHeight = 0;

            component.scrollToBottom();

            expect((component as any).messageBox.nativeElement.scrollTop).toBe(mockScrollHeight);
        });
    });
});
