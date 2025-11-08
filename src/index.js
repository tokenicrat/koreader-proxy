export default {
    async fetch(request, env, ctx) {
        const DOMAIN_MAPPINGS = {
            [env.WP_ZH_DOMAIN]: 'zh.wikipedia.org',
            [env.WP_EN_DOMAIN]: 'en.wikipedia.org',
            [env.GT_DOMAIN]: 'translate.googleapis.com'
        };

        const VALID_TOKENS = [
            env.TOKEN
        ];

        const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

        try {
            const url = new URL(request.url);
            const hostname = url.hostname;

            // 防止变成万物反代
            if (!DOMAIN_MAPPINGS[hostname]) {
                return new Response('Domain not allowed', {
                    status: 403,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }

            const pathParts = url.pathname.split('/').filter(part => part !== '');

            // 没有 TOKEN 路径验证，几天内就会被 GFW 阻断
            if (pathParts.length === 0) {
                return new Response('Token required in path', {
                    status: 400,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }

            const token = pathParts[0];

            if (!VALID_TOKENS.includes(token)) {
                return new Response('Invalid token', {
                    status: 401,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }

            const actualPath = '/' + pathParts.slice(1).join('/');
            const targetDomain = DOMAIN_MAPPINGS[hostname];
            const targetUrl = new URL(actualPath + url.search, `https://${targetDomain}`);

            // 修改原始请求头
            const modifiedRequest = new Request(targetUrl.toString(), {
                method: request.method,
                headers: request.headers,
                body: request.body,
                redirect: 'manual'
            });

            // 维基百科 API 会阻止无 UA 的请求
            modifiedRequest.headers.set('User-Agent', USER_AGENT);
            modifiedRequest.headers.set('Host', targetDomain);

            // 移除 Cloudflare 加入的请求头
            modifiedRequest.headers.delete('CF-Ray');
            modifiedRequest.headers.delete('CF-Connecting-IP');
            modifiedRequest.headers.delete('CF-IPCountry');
            modifiedRequest.headers.delete('CF-Visitor');

            // 维基百科 API 似乎还会验证 Referer
            if (targetDomain.includes('wikipedia.org')) {
                modifiedRequest.headers.set('Referer', `https://${targetDomain}/`);
            }

            const response = await fetch(modifiedRequest);

            const modifiedResponse = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });

            modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
            modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            // 修改响应中 URL 走代理
            const location = modifiedResponse.headers.get('Location');
            if (location) {
                try {
                    const locationUrl = new URL(location);
                    if (locationUrl.hostname === targetDomain) {
                        const proxyLocation = `https://${hostname}/${token}${locationUrl.pathname}${locationUrl.search}`;
                        modifiedResponse.headers.set('Location', proxyLocation);
                    }
                } catch (e) {
                    if (location.startsWith('/')) {
                        const proxyLocation = `https://${hostname}/${token}${location}`;
                        modifiedResponse.headers.set('Location', proxyLocation);
                    }
                }
            }

            return modifiedResponse;

        } catch (error) {
            console.error('Proxy error:', error);
            return new Response('Internal Server Error', {
                status: 500,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
    }
};

addEventListener('fetch', event => {
    if (event.request.method === 'OPTIONS') {
        event.respondWith(new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            }
        }));
    }
});
