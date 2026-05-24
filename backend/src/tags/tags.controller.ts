import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Public()
  @Get('resolve/:uuid')
  @ApiOperation({ summary: 'Resolve a tag UUID and return public user information' })
  @ApiResponse({ status: 200, description: 'Tag and public user info found' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async resolve(@Param('uuid') uuid: string) {
    const data = await this.tagsService.resolveTag(uuid);
    if (!data) {
      throw new NotFoundException('Tag não encontrada');
    }
    return data;
  }
}
