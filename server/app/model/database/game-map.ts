import { CharacterType } from '@common/character-type';
import { GameMode } from '@common/game-mode';
import { ItemType } from '@common/item-type';
import { MapTileType } from '@common/map-tile-type';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

export type MapDocument = GameMap & Document;

@Schema({ collection: 'gameMaps' })
export class GameMap {
    @ApiProperty()
    @Prop({ required: true })
    id: string;

    @ApiProperty()
    @Prop({ required: true })
    name: string;

    @ApiProperty()
    @Prop({ required: true })
    mode: GameMode;

    @ApiProperty()
    @Prop({ required: true })
    visibility: boolean;

    @ApiProperty()
    @Prop({ required: true })
    lastModified: string;

    @ApiProperty()
    @Prop({ required: true })
    description: string;

    @ApiProperty()
    @Prop({ required: true })
    size: number;

    @ApiProperty()
    @Prop({ required: true })
    creator: string;

    @ApiProperty()
    @Prop({
        required: true,
        type: [
            [
                {
                    type: { type: Object, required: true },
                    item: { type: Object, required: true },
                    character: {
                        type: Object,
                        default: CharacterType.NoCharacter,
                    },
                },
            ],
        ],
    })
    terrain: {
        type: MapTileType;
        item: ItemType;
        character: CharacterType;
    }[][];
}

export const mapSchema = SchemaFactory.createForClass(GameMap);
