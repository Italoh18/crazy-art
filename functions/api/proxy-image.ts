import { Env } from './_auth';

export const onRequestGet: any = async ({ request }: { request: Request, env: Env }) => {
  const url = new URL(request.url).searchParams.get('url');
  if (!url) {
    return new Response('Missing url', { status: 400 });
  }

  try {
    const response = await fetch(url);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
};
