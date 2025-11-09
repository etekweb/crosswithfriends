import {FastifyInstance} from 'fastify';
import _ from 'lodash';

import {InfoJson} from '../../src/shared/types';
import {getGameInfo} from '../model/game';
import {islinkExpanderBot, isFBMessengerCrawler} from '../../utils/link_preview_util';
import {getPuzzleInfo} from '../model/puzzle';

async function linkPreviewRouter(fastify: FastifyInstance) {
  fastify.get<{Querystring: {url: string}}>('/', async (request, reply) => {
    request.log.debug({headers: request.headers, query: request.query}, 'got req');

    let url: URL;
    try {
      url = new URL(request.query.url as string);
    } catch {
      const error = new Error('Invalid URL') as Error & {statusCode: number};
      error.statusCode = 400;
      throw error;
    }

    let info: InfoJson | null = null;
    const pathParts = url.pathname.split('/');
    if (pathParts[1] === 'game') {
      const gid = pathParts[2];
      info = (await getGameInfo(gid)) as InfoJson;
    } else if (pathParts[1] === 'play') {
      const pid = pathParts[2];
      info = (await getPuzzleInfo(pid)) as InfoJson;
    } else {
      const error = new Error('Invalid URL path') as Error & {statusCode: number};
      error.statusCode = 400;
      throw error;
    }

    if (_.isEmpty(info)) {
      const error = new Error('Game or puzzle not found') as Error & {statusCode: number};
      error.statusCode = 404;
      throw error;
    }

    const ua = request.headers['user-agent'] as string;

    if (!islinkExpanderBot(ua)) {
      // In case a human accesses this endpoint
      return reply.redirect(url.href);
    }

    // OGP doesn't support an author property, so we need to delegate to the oEmbed endpoint
    const protocol = request.protocol;
    const host = request.headers.host || '';
    const oembedEndpointUrl = `${protocol}://${host}/api/oembed?author=${encodeURIComponent(info.author)}`;

    // Messenger only supports title + thumbnail, so cram everything into the title property if Messenger
    const titlePropContent = isFBMessengerCrawler(ua)
      ? [info.title, info.author, info.description].filter(Boolean).join(' | ')
      : info.title;

    // https://ogp.me
    return reply.type('text/html').send(String.raw`
        <html prefix="og: https://ogp.me/ns/website#">
            <head>
                <title>${titlePropContent}</title>
                <meta property="og:title" content="${titlePropContent}" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="${url.href}" />
                <meta property="og:description" content="${info.description}" />
                <meta property="og:site_name" content="downforacross.com" />
                <link type="application/json+oembed" href=${oembedEndpointUrl} />
                <meta name="theme-color" content="#6aa9f4">
            </head>
        </html>
    `);
  });
}

export default linkPreviewRouter;
