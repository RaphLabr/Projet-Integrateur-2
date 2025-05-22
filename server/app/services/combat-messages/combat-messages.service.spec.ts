import { GameRoomGateway } from '@app/gateways/game-room/game-room.gateway';
import { AttackMessageInfo } from '@app/interfaces/attack-message-info/attack-message.interface-info';
import { CombatMessagesService } from '@app/services/combat-messages/combat-messages.service';
import { CharacterType } from '@common/character-type';
import { Player } from '@common/player';
import { PlayersInCombat } from '@common/players-in-combat';

describe('CombatMessagesService', () => {
    let service: CombatMessagesService;
    let gameRoomGatewayMock: jest.Mocked<GameRoomGateway>;

    const mockGameId = 'test-game-id';
    const mockPlayer1: Player = {
        id: CharacterType.Character1,
        name: 'Player1',
        health: 10,
        maxHealth: 10,
    } as Player;

    const mockPlayer2: Player = {
        id: CharacterType.Character2,
        name: 'Player2',
        health: 8,
        maxHealth: 10,
    } as Player;

    beforeEach(() => {
        gameRoomGatewayMock = {
            sendCombatMessage: jest.fn(),
            sendCombatOverMessage: jest.fn(),
            sendCombatOverLog: jest.fn(),
        } as unknown as jest.Mocked<GameRoomGateway>;

        service = new CombatMessagesService(gameRoomGatewayMock);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('successfulEvadeMessage', () => {
        it('should send appropriate messages to both players when evade is successful', () => {
            service.successfulEvadeMessage(mockGameId, mockPlayer1, mockPlayer2);

            expect(gameRoomGatewayMock.sendCombatOverMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer1.id,
                expect.stringContaining(`Évasion Réussiée. Bravo ${mockPlayer1.name}`),
            );

            expect(gameRoomGatewayMock.sendCombatOverMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer2.id,
                expect.stringContaining(`${mockPlayer1.name} a réussi à s'échapper`),
            );
        });
    });

    describe('failedEvadeMessage', () => {
        it('should send appropriate messages to both players when evade fails', () => {
            service.failedEvadeMessage(mockGameId, mockPlayer1, mockPlayer2);

            expect(gameRoomGatewayMock.sendCombatMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer1.id,
                expect.stringContaining("Tentative d'évasion échouée"),
                'green',
            );

            expect(gameRoomGatewayMock.sendCombatMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer2.id,
                expect.stringContaining(`${mockPlayer1.name} a échoué à s'évader`),
                'red',
            );
        });
    });

    describe('attackMessage', () => {
        it('should send appropriate messages when attack is successful', () => {
            const attackInfo: AttackMessageInfo = {
                gameId: mockGameId,
                attacker: mockPlayer1,
                defender: mockPlayer2,
                attackRoll: 6,
                defenseRoll: 2,
                isAttackerOnIce: false,
                isDefenderOnIce: false,
                attackTotal: 10,
                defenseTotal: 5,
                attackResult: 5,
            };

            service.attackMessage(attackInfo);

            expect(gameRoomGatewayMock.sendCombatMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer1.id,
                expect.stringContaining(`Vous infligez 5 dégats à ${mockPlayer2.name}`),
                'green',
            );

            expect(gameRoomGatewayMock.sendCombatMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer2.id,
                expect.stringContaining(`Vous recevez 5 dégats de ${mockPlayer1.name}`),
                'red',
            );
        });

        it('should send appropriate messages when attack fails', () => {
            const attackInfo: AttackMessageInfo = {
                gameId: mockGameId,
                attacker: mockPlayer1,
                defender: mockPlayer2,
                attackRoll: 2,
                defenseRoll: 6,
                isAttackerOnIce: false,
                isDefenderOnIce: false,
                attackTotal: 6,
                defenseTotal: 10,
                attackResult: -4,
            };

            service.attackMessage(attackInfo);

            expect(gameRoomGatewayMock.sendCombatMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer1.id,
                expect.stringContaining('Votre attaque a échoué!'),
                'green',
            );

            expect(gameRoomGatewayMock.sendCombatMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer2.id,
                expect.stringContaining("Vous avez défendu l'attaque!"),
                'red',
            );
        });

        it('should include ice penalty information in messages when applicable', () => {
            const attackInfo: AttackMessageInfo = {
                gameId: mockGameId,
                attacker: mockPlayer1,
                defender: mockPlayer2,
                attackRoll: 4,
                defenseRoll: 3,
                isAttackerOnIce: true,
                isDefenderOnIce: true,
                attackTotal: 8,
                defenseTotal: 7,
                attackResult: 1,
            };

            service.attackMessage(attackInfo);

            expect(gameRoomGatewayMock.sendCombatMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer1.id,
                expect.stringContaining(`${mockPlayer1.name} est sur la glace, il roule 2 de moins!`),
                'green',
            );

            expect(gameRoomGatewayMock.sendCombatMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer2.id,
                expect.stringContaining(`${mockPlayer2.name} est sur la glace, il roule 2 de moins!`),
                'red',
            );
        });
    });

    describe('combatWinnerMessage', () => {
        const playersInCombat: PlayersInCombat = {
            initiator: mockPlayer1,
            target: mockPlayer2,
            initiatorPosition: { x: 1, y: 1 },
            targetPosition: { x: 2, y: 2 },
        };

        it('should send appropriate messages when initiator wins', () => {
            service.combatWinnerMessage(mockGameId, playersInCombat, mockPlayer1);

            expect(gameRoomGatewayMock.sendCombatOverMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer1.id,
                expect.stringContaining(`Vous avez gagné le combat contre ${mockPlayer2.name}`),
            );

            expect(gameRoomGatewayMock.sendCombatOverMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer2.id,
                expect.stringContaining(`${mockPlayer1.name} a gagné le combat`),
            );

            expect(gameRoomGatewayMock.sendCombatOverLog).toHaveBeenCalledWith(
                mockGameId,
                expect.stringContaining(`${mockPlayer1.name} a gagné le combat contre ${mockPlayer2.name}`),
            );
        });

        it('should send appropriate messages when target wins', () => {
            service.combatWinnerMessage(mockGameId, playersInCombat, mockPlayer2);

            expect(gameRoomGatewayMock.sendCombatOverMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer1.id,
                expect.stringContaining(`${mockPlayer2.name} a gagné le combat`),
            );

            expect(gameRoomGatewayMock.sendCombatOverMessage).toHaveBeenCalledWith(
                mockGameId,
                mockPlayer2.id,
                expect.stringContaining(`Vous avez gagné le combat contre ${mockPlayer1.name}`),
            );

            expect(gameRoomGatewayMock.sendCombatOverLog).toHaveBeenCalledWith(
                mockGameId,
                expect.stringContaining(`${mockPlayer2.name} a gagné le combat contre ${mockPlayer1.name}`),
            );
        });
    });
});
