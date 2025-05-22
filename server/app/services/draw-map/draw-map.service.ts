import { MapTile } from '@app/constants/map-tile';
import { MAP_DIMENSIONS } from '@app/constants/server-map-constants';
import { Injectable } from '@nestjs/common';
import { Canvas, CanvasRenderingContext2D, createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MapGeneratorService {
    private _mapSize: number;
    private _tileSize: number;
    private readonly _assetsPath = path.join(__dirname, '..', '..', 'assets');

    async updateMap(mapTiles: MapTile[][], id: string): Promise<void> {
        const existingFilePath = path.join(this._assetsPath, 'generated-maps', `${id}.jpeg`);
        if (fs.existsSync(existingFilePath)) {
            fs.unlinkSync(existingFilePath);
        }

        await this.getImageMap(mapTiles, id);
    }

    async getImageMap(mapTiles: MapTile[][], id: string): Promise<Buffer> {
        const filename = `${id}.jpeg`;
        const outputPath: string = path.join(this._assetsPath, 'generated-maps', filename);
        let buffer: Buffer;

        if (fs.existsSync(outputPath)) {
            buffer = fs.readFileSync(outputPath);
            return buffer;
        }

        buffer = await this.generateMapImage(mapTiles, id);

        return buffer;
    }

    async generateMapImage(mapTiles: MapTile[][], id: string): Promise<Buffer> {
        this._mapSize = mapTiles.length;
        this._tileSize = MAP_DIMENSIONS / this._mapSize;

        const canvas: Canvas = createCanvas(this._mapSize * this._tileSize, this._mapSize * this._tileSize);
        const ctx = canvas.getContext('2d');

        await this.drawTerrain(ctx, mapTiles);
        await this.drawItems(ctx, mapTiles);

        const filename = `${id}.jpeg`;
        const outputPath: string = path.join(this._assetsPath, 'generated-maps', filename);

        await new Promise((resolve) => {
            const out = fs.createWriteStream(outputPath);
            const stream = canvas.createJPEGStream();
            stream.pipe(out);
            out.on('finish', () => resolve(void 0));
        });

        const buffer = canvas.toBuffer('image/jpeg');
        return buffer;
    }

    private async drawTerrain(ctx: CanvasRenderingContext2D, mapTiles: MapTile[][]): Promise<void> {
        for (let y = 0; y < mapTiles.length; y++) {
            for (let x = 0; x < mapTiles.length; x++) {
                const tileType = mapTiles[y][x].type;
                const img = await loadImage(path.join(this._assetsPath, 'tiles', `${tileType}.png`));
                ctx.drawImage(img, x * this._tileSize, y * this._tileSize, this._tileSize, this._tileSize);
            }
        }
    }

    private async drawItems(ctx: CanvasRenderingContext2D, mapTiles: MapTile[][]): Promise<void> {
        for (let y = 0; y < mapTiles.length; y++) {
            for (let x = 0; x < mapTiles.length; x++) {
                const tile = mapTiles[y][x];
                if (tile.item && tile.item !== 'no-item') {
                    const formattedName = tile.item;
                    const img = await loadImage(path.join(this._assetsPath, 'items', `${formattedName}.png`));
                    ctx.drawImage(img, x * this._tileSize, y * this._tileSize, this._tileSize, this._tileSize);
                }
            }
        }
    }
}
