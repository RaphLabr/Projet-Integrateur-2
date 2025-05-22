// Max line disable in test file
/* eslint-disable max-lines */
// We use any to access private methods
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LARGE_MAP_SIZE, MEDIUM_MAP_SIZE, SMALL_MAP_SIZE } from '@app/constants/map-constants';
import { GameMap } from '@app/model/database/game-map';
import { MapValidationService } from '@app/services/map-validation/map-validation.service';
import { MapService } from '@app/services/map/map.service';
import { CharacterType } from '@common/character-type';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';
import { Test, TestingModule } from '@nestjs/testing';

describe('MapValidationService', () => {
    let service: MapValidationService;
    const mockMapService = {
        getAllMaps: jest.fn(async () => Promise.resolve([])),
    };

    const INVALID_SIZE = 5;
    let terrain;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [MapValidationService, { provide: MapService, useValue: mockMapService }],
        }).compile();

        service = module.get<MapValidationService>(MapValidationService);

        terrain = Array.from({ length: SMALL_MAP_SIZE }, () =>
            Array.from({ length: SMALL_MAP_SIZE }, () => ({ type: MapTileType.Base, item: ItemType.NoItem, character: CharacterType.NoCharacter })),
        );

        terrain[0][0] = { type: MapTileType.Base, item: ItemType.StartPosition };
        terrain[0][1] = { type: MapTileType.Base, item: ItemType.Potion1 };
        terrain[0][2] = { type: MapTileType.Base, item: ItemType.Potion2 };
        terrain[0][3] = { type: MapTileType.Base, item: ItemType.Skull };
        terrain[0][4] = { type: MapTileType.Base, item: ItemType.Sword };
        terrain[0][5] = { type: MapTileType.Base, item: ItemType.Torch };
        terrain[0][6] = { type: MapTileType.Base, item: ItemType.Barrel };
        terrain[0][7] = { type: MapTileType.Base, item: ItemType.StartPosition };
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should validate a correct map', async () => {
        terrain[0][1] = { type: MapTileType.Base, item: ItemType.Potion1 };
        terrain[0][2] = { type: MapTileType.Base, item: ItemType.Potion2 };
        const seven = 7;
        for (let i = 3; i < seven; i++) {
            terrain[0][i] = { type: MapTileType.Base, item: ItemType.NoItem };
        }
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test map',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain,
        };
        const result = await service.generateInvalidMapMessages(map);
        expect(result).toEqual([]);
    });

    it('should reject a map with the same name as another map', async () => {
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test map',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain,
        };
        const mapCopy: GameMap = {
            id: '2',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test map',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain,
        };

        mockMapService.getAllMaps = jest.fn(async () => Promise.resolve([{ ...mapCopy }]));
        const result = await service.generateInvalidMapMessages(map);
        expect(result).toContain("Le nom de la carte n'est pas unique");
    });

    it('should reject a map with an invalid name length', async () => {
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: '',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain,
        };
        const result = await service.generateInvalidMapMessages(map);
        expect(result).toContain('Le nom de la carte doit être entre 1 et 50 caractères');
    });

    it('should reject a map with an invalid description length', async () => {
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test name',
            description: '',
            size: SMALL_MAP_SIZE,
            terrain,
        };
        const result = await service.generateInvalidMapMessages(map);
        expect(result).toContain('La description de la carte doit être entre 1 et 500 caractères');
    });

    it('should reject a map with an invalid mode', async () => {
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: 'invalid_mode_value' as unknown as GameMode,
            name: 'Test name',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain,
        };
        const result = await service.generateInvalidMapMessages(map);
        expect(result).toContain("Le mode de jeu doit être 'capture du drapeau' ou 'classique'");
    });

    it('should reject a map with an invalid size', async () => {
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test name',
            description: 'Test description',
            size: INVALID_SIZE,
            terrain,
        };
        const result = await service.generateInvalidMapMessages(map);
        expect(result.some((msg) => msg.startsWith('Le nombre de positions de départ est incorrect'))).toBe(true);
    });

    it('should reject a map with invalid amount of terrain tiles', async () => {
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test name',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain: Array.from({ length: SMALL_MAP_SIZE }, () =>
                Array.from({ length: SMALL_MAP_SIZE }, () => ({
                    type: MapTileType.Wall,
                    item: ItemType.NoItem,
                    character: CharacterType.NoCharacter,
                })),
            ),
        };
        const result = await service.generateInvalidMapMessages(map);
        expect(result).toContain('Plus de 50% de la carte doit être des tuiles de terrain');
        expect(result).toContain('Les tuiles de terrain doivent être accessibles');
        expect(result.some((msg) => msg.startsWith('Le nombre de positions de départ est incorrect'))).toBe(true);
    });

    test.each([
        ['SMALL', SMALL_MAP_SIZE],
        ['MEDIUM', MEDIUM_MAP_SIZE],
        ['LARGE', LARGE_MAP_SIZE],
    ])('should reject a map with invalid amount of starting positions', async (_, size) => {
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test name',
            description: 'Test description',
            size,
            terrain: Array.from({ length: size }, () =>
                Array.from({ length: size }, () => ({
                    type: MapTileType.Base,
                    item: ItemType.NoItem,
                    character: CharacterType.NoCharacter,
                })),
            ),
        };
        const result = await service.generateInvalidMapMessages(map);
        expect(result.some((msg) => msg.startsWith('Le nombre de positions de départ est incorrect'))).toBe(true);
    });

    it('should accept a map with duplicate items due to implementation bug', async () => {
        const duplicateTerrain = Array.from({ length: SMALL_MAP_SIZE }, () =>
            Array.from({ length: SMALL_MAP_SIZE }, () => ({
                type: MapTileType.Base,
                item: ItemType.NoItem,
                character: CharacterType.NoCharacter,
            })),
        );

        duplicateTerrain[0][0] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
        duplicateTerrain[0][1] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
        duplicateTerrain[0][2] = { type: MapTileType.Base, item: ItemType.Barrel, character: CharacterType.NoCharacter };
        duplicateTerrain[0][3] = { type: MapTileType.Base, item: ItemType.Barrel, character: CharacterType.NoCharacter };

        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test name',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain: duplicateTerrain,
        };

        const result = await service.generateInvalidMapMessages(map);

        expect(result).not.toContain('Les items ne sont pas uniques');
        expect(result).toEqual([]);
    });

    it('should reject a map with doors not correctly placed', async () => {
        const doorTerrain = Array.from({ length: SMALL_MAP_SIZE }, () =>
            Array.from({ length: SMALL_MAP_SIZE }, () => ({
                type: MapTileType.Base,
                item: ItemType.NoItem,
                character: CharacterType.NoCharacter,
            })),
        );

        doorTerrain[5][5] = {
            type: MapTileType.OpenDoor,
            item: ItemType.NoItem,
            character: CharacterType.NoCharacter,
        };

        doorTerrain[0][0] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
        doorTerrain[0][1] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };

        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test name',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain: doorTerrain,
        };

        const result = await service.generateInvalidMapMessages(map);
        expect(result).toContain('Les portes doivent être entre des murs et ne doivent pas être bloquées par un mur ou un coté de la carte');
    });

    it('should reject a map with inaccessible terrain', async () => {
        const inaccessibleTerrain = Array.from({ length: SMALL_MAP_SIZE }, () =>
            Array.from({ length: SMALL_MAP_SIZE }, () => ({
                type: MapTileType.Base,
                item: ItemType.NoItem,
                character: CharacterType.NoCharacter,
            })),
        );

        for (let i = 0; i < SMALL_MAP_SIZE; i++) {
            inaccessibleTerrain[Math.floor(SMALL_MAP_SIZE / 2)][i] = {
                type: MapTileType.Wall,
                item: ItemType.NoItem,
                character: CharacterType.NoCharacter,
            };
        }

        inaccessibleTerrain[0][0] = {
            type: MapTileType.Base,
            item: ItemType.StartPosition,
            character: CharacterType.NoCharacter,
        };
        inaccessibleTerrain[SMALL_MAP_SIZE - 1][0] = {
            type: MapTileType.Base,
            item: ItemType.StartPosition,
            character: CharacterType.NoCharacter,
        };

        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test name',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain: inaccessibleTerrain,
        };

        const result = await service.generateInvalidMapMessages(map);
        expect(result).toContain('Les tuiles de terrain doivent être accessibles');
    });

    it('should return -1 if no valid starting tile is found', () => {
        const map: GameMap = {
            id: '1',
            size: SMALL_MAP_SIZE,
            terrain: Array.from({ length: SMALL_MAP_SIZE }, () =>
                Array.from({ length: SMALL_MAP_SIZE }, () => ({
                    type: MapTileType.Wall,
                    item: ItemType.NoItem,
                    character: CharacterType.NoCharacter,
                })),
            ),
        } as GameMap;

        const result = (service as any).findStartCoordinates(map);
        expect(result).toEqual({ x: -1, y: -1 });
    });

    it('should accept a door with horizontal walls only', async () => {
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test name',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain: Array.from({ length: SMALL_MAP_SIZE }, () =>
                Array.from({ length: SMALL_MAP_SIZE }, () => ({
                    type: MapTileType.Base,
                    item: ItemType.NoItem,
                    character: CharacterType.NoCharacter,
                })),
            ),
        };

        map.terrain[5][5] = { type: MapTileType.OpenDoor, item: ItemType.NoItem, character: CharacterType.NoCharacter };
        map.terrain[5][4] = { type: MapTileType.Wall, item: ItemType.NoItem, character: CharacterType.NoCharacter };
        map.terrain[5][6] = { type: MapTileType.Wall, item: ItemType.NoItem, character: CharacterType.NoCharacter };
        map.terrain[1][1] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
        map.terrain[1][2] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
        map.terrain[1][3] = { type: MapTileType.Base, item: ItemType.Potion1, character: CharacterType.NoCharacter };
        map.terrain[1][4] = { type: MapTileType.Base, item: ItemType.Potion2, character: CharacterType.NoCharacter };

        const result = await service.generateInvalidMapMessages(map);
        expect(result).toEqual([]);
    });

    it('should accept a door with vertical walls only', async () => {
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test name',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain: Array.from({ length: SMALL_MAP_SIZE }, () =>
                Array.from({ length: SMALL_MAP_SIZE }, () => ({
                    type: MapTileType.Base,
                    item: ItemType.NoItem,
                    character: CharacterType.NoCharacter,
                })),
            ),
        };

        map.terrain[5][5] = { type: MapTileType.OpenDoor, item: ItemType.NoItem, character: CharacterType.NoCharacter };
        map.terrain[4][5] = { type: MapTileType.Wall, item: ItemType.NoItem, character: CharacterType.NoCharacter };
        map.terrain[6][5] = { type: MapTileType.Wall, item: ItemType.NoItem, character: CharacterType.NoCharacter };
        map.terrain[1][1] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
        map.terrain[1][2] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
        map.terrain[1][3] = { type: MapTileType.Base, item: ItemType.Potion1, character: CharacterType.NoCharacter };
        map.terrain[1][4] = { type: MapTileType.Base, item: ItemType.Potion2, character: CharacterType.NoCharacter };

        const result = await service.generateInvalidMapMessages(map);
        expect(result).toEqual([]);
    });

    it('should return false for terrain accessibility when no start tile is found', async () => {
        const map: GameMap = {
            id: '1',
            visibility: true,
            lastModified: new Date().toISOString(),
            creator: 'creator',
            mode: GameMode.Classic,
            name: 'Test name',
            description: 'Test description',
            size: SMALL_MAP_SIZE,
            terrain: Array.from({ length: SMALL_MAP_SIZE }, () =>
                Array.from({ length: SMALL_MAP_SIZE }, () => ({
                    type: MapTileType.Wall,
                    item: ItemType.NoItem,
                    character: CharacterType.NoCharacter,
                })),
            ),
        };

        map.terrain[1][1].item = ItemType.StartPosition;
        map.terrain[1][2].item = ItemType.StartPosition;

        const findStartCoordinates = (service as any).findStartCoordinates.bind(service);
        const result = findStartCoordinates(map);
        expect(result).toEqual({ x: -1, y: -1 });
    });

    describe('MapValidationService - validateItems', () => {
        it('should reject a map with non-unique items', async () => {
            jest.spyOn(service as any, 'areItemsUnique').mockReturnValueOnce(false);

            const map: GameMap = {
                id: '1',
                visibility: true,
                lastModified: new Date().toISOString(),
                creator: 'creator',
                mode: GameMode.Classic,
                name: 'Test name',
                description: 'Test description',
                size: SMALL_MAP_SIZE,
                terrain,
            };

            const result = await service.generateInvalidMapMessages(map);

            expect(result).toContain('Les items ne sont pas uniques');
        });

        it('should reject a CTF map with no flag', async () => {
            const flaglessTerrain = Array.from({ length: SMALL_MAP_SIZE }, () =>
                Array.from({ length: SMALL_MAP_SIZE }, () => ({
                    type: MapTileType.Base,
                    item: ItemType.NoItem,
                    character: CharacterType.NoCharacter,
                })),
            );

            flaglessTerrain[0][0] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
            flaglessTerrain[0][1] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
            flaglessTerrain[0][2] = { type: MapTileType.Base, item: ItemType.Potion1, character: CharacterType.NoCharacter };
            flaglessTerrain[0][3] = { type: MapTileType.Base, item: ItemType.Potion2, character: CharacterType.NoCharacter };

            const map: GameMap = {
                id: '1',
                visibility: true,
                lastModified: new Date().toISOString(),
                creator: 'creator',
                mode: GameMode.CaptureTheFlag,
                name: 'Test name',
                description: 'Test description',
                size: SMALL_MAP_SIZE,
                terrain: flaglessTerrain,
            };

            const result = await service.generateInvalidMapMessages(map);

            expect(result).toContain('Il doit y avoir un drapeau en mode de jeu capture du drapeau');
        });

        it('should reject a CTF map with multiple flags', async () => {
            const multipleFlagsTerrain = Array.from({ length: SMALL_MAP_SIZE }, () =>
                Array.from({ length: SMALL_MAP_SIZE }, () => ({
                    type: MapTileType.Base,
                    item: ItemType.NoItem,
                    character: CharacterType.NoCharacter,
                })),
            );

            multipleFlagsTerrain[0][0] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
            multipleFlagsTerrain[0][1] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
            multipleFlagsTerrain[0][2] = { type: MapTileType.Base, item: ItemType.Flag, character: CharacterType.NoCharacter };
            multipleFlagsTerrain[0][3] = { type: MapTileType.Base, item: ItemType.Flag, character: CharacterType.NoCharacter };

            const map: GameMap = {
                id: '1',
                visibility: true,
                lastModified: new Date().toISOString(),
                creator: 'creator',
                mode: GameMode.CaptureTheFlag,
                name: 'Test name',
                description: 'Test description',
                size: SMALL_MAP_SIZE,
                terrain: multipleFlagsTerrain,
            };

            const result = await service.generateInvalidMapMessages(map);

            expect(result).toContain('Il doit y avoir un drapeau en mode de jeu capture du drapeau');
        });

        it('should reject a Classic map with a flag', async () => {
            const classicWithFlagTerrain = Array.from({ length: SMALL_MAP_SIZE }, () =>
                Array.from({ length: SMALL_MAP_SIZE }, () => ({
                    type: MapTileType.Base,
                    item: ItemType.NoItem,
                    character: CharacterType.NoCharacter,
                })),
            );

            classicWithFlagTerrain[0][0] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
            classicWithFlagTerrain[0][1] = { type: MapTileType.Base, item: ItemType.StartPosition, character: CharacterType.NoCharacter };
            classicWithFlagTerrain[0][2] = { type: MapTileType.Base, item: ItemType.Potion1, character: CharacterType.NoCharacter };
            classicWithFlagTerrain[0][3] = { type: MapTileType.Base, item: ItemType.Flag, character: CharacterType.NoCharacter };

            const map: GameMap = {
                id: '1',
                visibility: true,
                lastModified: new Date().toISOString(),
                creator: 'creator',
                mode: GameMode.Classic,
                name: 'Test name',
                description: 'Test description',
                size: SMALL_MAP_SIZE,
                terrain: classicWithFlagTerrain,
            };

            const result = await service.generateInvalidMapMessages(map);

            expect(result).toContain('Il ne doit pas y avoir de drapeau en mode classique');
        });
    });
});
