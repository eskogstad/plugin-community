/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Org, Connection } from '@salesforce/core';
import { Result } from '@salesforce/command';
import { RequestInfo } from 'jsforce/connection';
import { ConnectExecutor } from '../../../../../lib/connect/services/ConnectExecutor';
import { ConnectResource } from '../../../../../lib/connect/services/ConnectResource';

const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const should = chai.should();
chai.use(require('chai-as-promised'));

describe('ConnectExecutor', () => {
  const relativeUrl = '/relativeUrl/';

  class DummyPostConnectResource implements ConnectResource<Result> {
    fetchRelativeConnectUrl(): Promise<string> {
      return Promise.resolve(relativeUrl + this.getRequestMethod());
    }
    getRequestMethod(): string {
      return 'POST';
    }
    fetchPostParams(): Promise<string> {
      return Promise.resolve(
        JSON.stringify({
          param: 'value',
        })
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handleSuccess(result: import('@salesforce/ts-types').JsonCollection): import('@salesforce/command').Result {
      return {
        data: 'success',
        ux: null,
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        display: () => {},
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handleError(error: Error): import('@salesforce/command').Result {
      throw new Error('handleError is called');
    }
  }

  class DummyGetConnectResource extends DummyPostConnectResource {
    getRequestMethod(): string {
      return 'GET';
    }
    fetchPostParams(): Promise<string> {
      throw new Error('Should not be called');
    }
  }

  // Patch operation is not supported yet
  class DummyPatchConnectResource extends DummyPostConnectResource {
    getRequestMethod(): string {
      return 'PATCH';
    }
    fetchPostParams(): Promise<string> {
      throw new Error('Should not be called');
    }
  }

  describe('fetchRequestInfo', () => {
    it('should not call fetchPostParams for a GET call', async () => {
      const executor: ConnectExecutor<Result> = new ConnectExecutor(new DummyGetConnectResource(), new Org(null));
      // If fetchPostParams was called, it will throw an exception
      const ri: RequestInfo = await executor.fetchRequestInfo();
      should.exist(ri);
      expect(ri.url).to.be.equal(relativeUrl + 'GET');
      expect(ri.method).to.be.equal('GET');
      expect(ri.body).to.be.equal(null);
      should.not.exist(ri.headers);
    });

    it('should call fetchPostParams for a POST call', async () => {
      const executor: ConnectExecutor<Result> = new ConnectExecutor(new DummyPostConnectResource(), new Org(null));
      const ri: RequestInfo = await executor.fetchRequestInfo();
      should.exist(ri);
      expect(ri.url).to.be.equal(relativeUrl + 'POST');
      expect(ri.method).to.be.equal('POST');
      expect(ri.body).to.be.equal(
        JSON.stringify({
          param: 'value',
        })
      );
      should.not.exist(ri.headers);
    });

    it('should throw for unsupported method calls', async () => {
      const executor: ConnectExecutor<Result> = new ConnectExecutor(new DummyPatchConnectResource(), new Org(null));
      await expect(executor.fetchRequestInfo()).to.be.rejectedWith('Unsupported method is given: PATCH');
    });
  });

  describe('callConnectApi', () => {
    it('should call handleSuccess on success response', async () => {
      const org = new Org(null);
      sinon.stub(org, 'getConnection').callsFake(() => {
        const connection = new Connection({
          authInfo: null,
        });
        sinon.stub(connection, 'request').callsFake(() => Promise.resolve('success'));
        return connection;
      });
      const executor: ConnectExecutor<Result> = new ConnectExecutor(new DummyGetConnectResource(), org);
      const response: Result = await executor.callConnectApi();
      expect(response.data).to.be.equal('success');
      expect(response.ux).to.be.equal(null);
    });

    it('should call handleError on error response', async () => {
      const org = new Org(null);
      sinon.stub(org, 'getConnection').callsFake(() => {
        const connection = new Connection({
          authInfo: null,
        });
        sinon.stub(connection, 'request').callsFake(() => Promise.reject('error'));
        return connection;
      });
      const executor: ConnectExecutor<Result> = new ConnectExecutor(new DummyGetConnectResource(), org);
      await expect(executor.callConnectApi()).to.be.rejectedWith('handleError is called');
    });
  });
});
