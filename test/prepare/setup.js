// prepare/setup.js
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { BatchInterceptor } from '@mswjs/interceptors';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';
const mockFixtures = import.meta.glob('../models/**/*.json', { eager: true });

document.body.innerHTML = '<div id="container" style="width:1024px;height:1024px"></div>';

Object.defineProperty(navigator, 'userAgent', {
  value: 'node.js',
  configurable: true
});

import util from 'node:util';
if (!util.styleText) {
  util.styleText = (format, text) => text;
}

const interceptor = new BatchInterceptor({
  name: 'vitest-xhr-fix',
  interceptors: [new XMLHttpRequestInterceptor()],
});

export const restHandlers = [
  http.get('https://www.mytestserver.com/models/:id', ({params}) => {
    const { id } = params;
    const lookupKey = `../models/${id}`;
    const fileData = mockFixtures[lookupKey];
    if (fileData) {
      console.log("Response here")
      const response = HttpResponse.json(fileData.default || fileData);
      return response;
    }
  }),
]

const server = setupServer(...restHandlers)

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  interceptor.apply();
})

// Close server after all tests
afterAll(() => {
  server.close();
  interceptor.dispose();
})

// Reset handlers after each test for test isolation
afterEach(() => server.resetHandlers())
