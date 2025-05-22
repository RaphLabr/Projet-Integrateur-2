import { GameMap, MapDocument } from '@app/model/database/game-map';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class MapService {
    constructor(@InjectModel(GameMap.name) public mapModel: Model<MapDocument>) {}

    async createNewMap(map: GameMap): Promise<void> {
        const newMap = new this.mapModel(map);
        newMap.save();
    }

    async updateMap(map: GameMap): Promise<void> {
        await this.mapModel.updateOne({ id: map.id }, map).exec();
    }

    async getAllMaps(): Promise<GameMap[]> {
        const maps = await this.mapModel.find().exec();

        return maps;
    }

    async getMapById(mapId: string): Promise<GameMap> {
        const map = await this.mapModel.findOne({ id: mapId }).exec();
        return map;
    }

    async getMapSizeById(mapId: string): Promise<number> {
        const map = await this.getMapById(mapId);
        if (!map) {
            throw new Error(`Map with mapId ${mapId} not found`);
        }
        return map.size;
    }

    async changeMapVisibilityById(mapId: string): Promise<number> {
        const map = await this.mapModel.findOne({ id: mapId }).exec();
        if (!map) {
            throw new Error(`Map with mapId ${mapId} not found`);
        }

        const updatedMap = await this.mapModel.updateOne({ id: mapId }, { $set: { visibility: !map.visibility } }).exec();
        return updatedMap.modifiedCount;
    }

    async deleteMapById(mapId: string): Promise<number> {
        const map = await this.mapModel.deleteOne({ id: mapId }).exec();
        if (map.deletedCount === 0) {
            throw new Error(`Map with mapId ${mapId} not found`);
        }

        return map.deletedCount;
    }
}
