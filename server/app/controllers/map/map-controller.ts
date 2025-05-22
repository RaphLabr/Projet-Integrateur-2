import { GameMap } from '@app/model/database/game-map';
import { MapGeneratorService } from '@app/services/draw-map/draw-map.service';
import { MapValidationService } from '@app/services/map-validation/map-validation.service';
import { MapService } from '@app/services/map/map.service';
import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Put, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Image } from 'canvas';
import { Response } from 'express';

@ApiTags('Carte de jeu')
@Controller('map')
export class MapController {
    constructor(
        private readonly _mapService: MapService,
        private readonly _mapValidationService: MapValidationService,
        private readonly _mapGeneratorService: MapGeneratorService,
    ) {}

    @ApiOkResponse({
        description: 'Saves a new map',
        type: GameMap,
    })
    @Post('/')
    async saveMap(@Body() map: GameMap, @Res() response: Response): Promise<void> {
        try {
            const invalidMapMessages: string[] = await this._mapValidationService.generateInvalidMapMessages(map);
            if (invalidMapMessages.length === 0) {
                await this._mapService.createNewMap(map);
                await this._mapGeneratorService.updateMap(map.terrain, map.id);
                response.status(HttpStatus.CREATED).json({ messages: 'Carte enregistrée' });
            } else {
                response.status(HttpStatus.BAD_REQUEST).json({ messages: invalidMapMessages });
            }
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ messages: error.message });
        }
    }

    @ApiOkResponse({
        description: 'Updates a map',
        type: GameMap,
    })
    @Put('/')
    async updateMap(@Body() map: GameMap, @Res() response: Response): Promise<void> {
        try {
            const invalidMapMessages: string[] = await this._mapValidationService.generateInvalidMapMessages(map);
            if (invalidMapMessages.length === 0) {
                await this._mapService.updateMap(map);
                await this._mapGeneratorService.updateMap(map.terrain, map.id);
                response.status(HttpStatus.OK).json({ messages: 'Carte modifiée' });
            } else {
                response.status(HttpStatus.BAD_REQUEST).json({ messages: invalidMapMessages });
            }
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ messages: error.message });
        }
    }

    @ApiOkResponse({
        description: 'Returns all maps',
        type: GameMap,
        isArray: true,
    })
    @Get('/')
    async allMaps(@Res() response: Response): Promise<void> {
        try {
            const allMaps = await this._mapService.getAllMaps();
            response.status(HttpStatus.OK).json(allMaps);
        } catch (error) {
            response.status(HttpStatus.NOT_FOUND).send(error.message);
        }
    }

    @ApiOkResponse({
        description: 'Returns a map by ID',
        type: GameMap,
    })
    @Get('/:id')
    async getMapById(@Res() response: Response, @Param('id') id: string): Promise<void> {
        try {
            const map = await this._mapService.getMapById(id);
            if (!map) {
                response.status(HttpStatus.NOT_FOUND).send('Carte non trouvée');
                return;
            }
            response.status(HttpStatus.OK).json(map);
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error.message);
        }
    }

    @Get('/:id/size')
    async getMapSize(@Res() response: Response, @Param('id') id: string): Promise<void> {
        try {
            const mapSize = await this._mapService.getMapSizeById(id);
            response.status(HttpStatus.OK).json(mapSize);
        } catch (error) {
            response.status(HttpStatus.NOT_FOUND).send(error.message);
        }
    }

    @Patch('/:id')
    async changeMapVisibilityById(@Res() response: Response, @Param('id') id: string): Promise<void> {
        try {
            const map = await this._mapService.changeMapVisibilityById(id);
            if (!map) {
                throw new Error(`${map}`);
            }

            response.status(HttpStatus.OK).send();
        } catch (error) {
            response.status(HttpStatus.NOT_FOUND).send(error.message);
        }
    }

    @Delete('/:id')
    async deleteMapById(@Res() response: Response, @Param('id') id: string): Promise<void> {
        try {
            const map = await this._mapService.deleteMapById(id);
            if (!map) {
                throw new Error('Carte non trouvée');
            }

            response.status(HttpStatus.OK).send();
        } catch (error) {
            response.status(HttpStatus.NOT_FOUND).send(error.message);
        }
    }

    @ApiOkResponse({
        description: 'Returns an image of the map',
        type: Image,
    })
    @Get('/:id/image')
    async getMapImage(@Res() response: Response, @Param('id') id: string): Promise<void> {
        try {
            const map = await this._mapService.getMapById(id);
            if (!map) {
                throw new Error('Carte non trouvée dans la base de données');
            }
            response.setHeader('Content-Type', 'image/jpeg');
            const mapImage = await this._mapGeneratorService.getImageMap(map.terrain, id);
            response.status(HttpStatus.OK).send(mapImage);
        } catch (error) {
            response.status(HttpStatus.NOT_FOUND).send(error.message);
        }
    }
}
