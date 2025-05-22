import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatRoomService } from '@app/services/chat-room-service/chat-room.service';
import { GENERAL_BUFFER } from '@common/timer-constants';
import { Observable, Subscription } from 'rxjs';

@Component({
    selector: 'app-chat-box',
    imports: [FormsModule],
    templateUrl: './chat-box.component.html',
    styleUrl: './chat-box.component.scss',
})
export class ChatBoxComponent implements OnDestroy, AfterViewInit {
    @Input() playerName: string = '';
    @Input() gameId: string = '';
    @ViewChild('messagesBox') private messageBox: ElementRef;
    messageInput: string = '';
    private _messagesSubscription: Subscription;

    constructor(private _chatRoomService: ChatRoomService) {}

    get messagesObservable(): Observable<string[]> {
        return this._chatRoomService.messages$;
    }

    get messages(): string[] {
        return this._chatRoomService.messages;
    }

    ngAfterViewInit(): void {
        this.scrollToBottom();
        this._messagesSubscription = this.messagesObservable.subscribe(async () => {
            const { scrollTop, clientHeight, scrollHeight } = this.messageBox.nativeElement;
            if (scrollTop + clientHeight >= scrollHeight - 1) {
                setTimeout(() => this.scrollToBottom(), GENERAL_BUFFER);
            }
        });
    }

    ngOnDestroy(): void {
        if (this._messagesSubscription) {
            this._messagesSubscription.unsubscribe();
        }
    }

    sendMessage() {
        this._chatRoomService.sendMessage(this.messageInput, this.gameId);
        this.messageInput = '';
        this.scrollToBottom();
    }

    scrollToBottom() {
        const boxElement = this.messageBox.nativeElement;
        boxElement.scrollTop = boxElement.scrollHeight;
    }
}
