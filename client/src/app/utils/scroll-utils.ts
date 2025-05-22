import { ElementRef } from '@angular/core';
import { ChatMessage } from '@common/chat-message';
import { Observable, Subscription } from 'rxjs';

export function scrollToBottom(messageBox: ElementRef) {
    setTimeout(() => {
        const boxElement = messageBox.nativeElement;
        boxElement.scrollTop = boxElement.scrollHeight;
    }, 0);
}

export function subscribeToMessagesForScroll(messagesObservable: Observable<string[] | ChatMessage[]>, messageBox: ElementRef): Subscription {
    scrollToBottom(messageBox);
    return messagesObservable.subscribe(async () => {
        const { scrollTop, clientHeight, scrollHeight } = messageBox.nativeElement;
        if (scrollTop + clientHeight >= scrollHeight - 1) {
            scrollToBottom(messageBox);
        }
    });
}
