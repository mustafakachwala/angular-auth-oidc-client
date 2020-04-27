import { TestBed } from '@angular/core/testing';
import { ConfigurationProvider } from '../../config';
import { OpenIdConfiguration } from '../../config/openid-configuration';
import { FlowsDataService } from '../../flows/flows-data.service';
import { RandomService } from '../../flows/random/random.service';
import { LoggerService } from '../../logging/logger.service';
import { LoggerServiceMock } from '../../logging/logger.service-mock';
import { StoragePersistanceService } from '../../storage';
import { StoragePersistanceServiceMock } from '../../storage/storage-persistance.service-mock';
import { TokenValidationService } from '../../validation/token-validation.service';
import { TokenValidationServiceMock } from '../../validation/token-validation.service-mock';
import { FlowHelper } from '../flowHelper/flow-helper.service';
import { PlatformProvider } from '../platform-provider/platform.provider';
import { PlatformProviderMock } from '../platform-provider/platform.provider-mock';
import { AuthWellKnownEndpoints } from './../../config/auth-well-known-endpoints';
import { UrlService } from './url.service';

describe('UrlService Tests', () => {
    let service: UrlService;
    let configurationProvider: ConfigurationProvider;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ConfigurationProvider,
                FlowsDataService,
                UrlService,
                {
                    provide: LoggerService,
                    useClass: LoggerServiceMock,
                },
                { provide: PlatformProvider, useClass: PlatformProviderMock },
                { provide: StoragePersistanceService, useClass: StoragePersistanceServiceMock },
                { provide: TokenValidationService, useClass: TokenValidationServiceMock },
                RandomService,
                FlowHelper,
            ],
        });
    });

    beforeEach(() => {
        service = TestBed.inject(UrlService);
        configurationProvider = TestBed.inject(ConfigurationProvider);
    });

    it('should create', () => {
        expect(service).toBeTruthy();
    });

    describe('getUrlParameter', () => {
        it('returns empty string when there is no urlToCheck', () => {
            const result = service.getUrlParameter('', 'code');

            expect(result).toBe('');
        });

        it('returns empty string when there is no name', () => {
            const result = service.getUrlParameter('url', '');

            expect(result).toBe('');
        });

        it('returns empty string when name is not a uri', () => {
            const result = service.getUrlParameter('url', 'anything');

            expect(result).toBe('');
        });

        it('parses Url correctly with hash in the end', () => {
            const urlToCheck = 'https://www.example.com/signin?code=thisisacode&state=0000.1234.000#';
            const code = service.getUrlParameter(urlToCheck, 'code');
            const state = service.getUrlParameter(urlToCheck, 'state');

            expect(code).toBe('thisisacode');
            expect(state).toBe('0000.1234.000');
        });

        it('parses url with special chars in param and hash in the end', () => {
            const urlToCheck = 'https://www.example.com/signin?code=thisisa$-_.+!*(),code&state=0000.1234.000#';
            const code = service.getUrlParameter(urlToCheck, 'code');
            const state = service.getUrlParameter(urlToCheck, 'state');

            expect(code).toBe('thisisa$-_.+!*(),code');
            expect(state).toBe('0000.1234.000');
        });

        it('parses Url correctly with number&delimiter in params', () => {
            const urlToCheck = 'https://www.example.com/signin?code=thisisacode&state=0000.1234.000';
            const code = service.getUrlParameter(urlToCheck, 'code');
            const state = service.getUrlParameter(urlToCheck, 'state');

            expect(code).toBe('thisisacode');
            expect(state).toBe('0000.1234.000');
        });

        it('gets correct param if params divided vith slash', () => {
            const urlToCheck = 'https://www.example.com/signin?state=0000.1234.000&ui_locales=de&code=thisisacode#lang=de';
            const code = service.getUrlParameter(urlToCheck, 'code');
            const state = service.getUrlParameter(urlToCheck, 'state');

            expect(code).toBe('thisisacode');
            expect(state).toBe('0000.1234.000');
        });
    });

    describe('createAuthorizeUrl', () => {
        it('returns empty string when no authoizationendpoint given -> wellKnownEndpoints null', () => {
            configurationProvider.setConfig(null, null);

            const value = (service as any).createAuthorizeUrl(
                '', // Implicit Flow
                'https://localhost:44386',
                'nonce',
                'state'
            );

            const expectValue = '';

            expect(value).toEqual(expectValue);
        });

        it('returns empty string when no authoizationendpoint given -> configurationProvider null', () => {
            (service as any).configurationProvider = null;

            const value = (service as any).createAuthorizeUrl(
                '', // Implicit Flow
                'https://localhost:44386',
                'nonce',
                'state'
            );

            const expectValue = '';

            expect(value).toEqual(expectValue);
        });

        it('createAuthorizeUrl with code flow adds "code_challenge" and "code_challenge_method" param', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'code';
            config.scope = 'openid email profile';
            config.redirectUrl = 'https://localhost:44386';

            config.customParams = {
                testcustom: 'customvalue',
            };

            configurationProvider.setConfig(config, { authorizationEndpoint: 'http://example' });

            const value = (service as any).createAuthorizeUrl(
                '', // Implicit Flow
                config.redirectUrl,
                'nonce',
                'state'
            );

            const expectValue =
                'http://example?client_id=188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com' +
                '&redirect_uri=https%3A%2F%2Flocalhost%3A44386' +
                '&response_type=code' +
                '&scope=openid%20email%20profile' +
                '&nonce=nonce' +
                '&state=state' +
                '&code_challenge=&code_challenge_method=S256' +
                '&testcustom=customvalue';

            expect(value).toEqual(expectValue);
        });

        it('createAuthorizeUrl with prompt adds prompt value', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';

            configurationProvider.setConfig(config, { authorizationEndpoint: 'http://example' });

            const value = (service as any).createAuthorizeUrl(
                '', // Implicit Flow
                config.redirectUrl,
                'nonce',
                'state',
                'myprompt'
            );

            const expectValue =
                'http://example?client_id=188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com' +
                '&redirect_uri=https%3A%2F%2Flocalhost%3A44386' +
                '&response_type=id_token%20token' +
                '&scope=openid%20email%20profile' +
                '&nonce=nonce' +
                '&state=state' +
                '&prompt=myprompt';

            expect(value).toEqual(expectValue);
        });

        it('createAuthorizeUrl with hdParam adds hdparam value', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';
            config.hdParam = 'myHdParam';

            configurationProvider.setConfig(config, { authorizationEndpoint: 'http://example' });

            const value = (service as any).createAuthorizeUrl(
                '', // Implicit Flow
                config.redirectUrl,
                'nonce',
                'state'
            );

            const expectValue =
                'http://example?client_id=188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com' +
                '&redirect_uri=https%3A%2F%2Flocalhost%3A44386' +
                '&response_type=id_token%20token' +
                '&scope=openid%20email%20profile' +
                '&nonce=nonce' +
                '&state=state' +
                '&hd=myHdParam';

            expect(value).toEqual(expectValue);
        });

        it('createAuthorizeUrl with custom value', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';

            config.customParams = {
                testcustom: 'customvalue',
            };

            configurationProvider.setConfig(config, { authorizationEndpoint: 'http://example' });

            const value = (service as any).createAuthorizeUrl(
                '', // Implicit Flow
                config.redirectUrl,
                'nonce',
                'state'
            );

            const expectValue =
                'http://example?client_id=188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com' +
                '&redirect_uri=https%3A%2F%2Flocalhost%3A44386' +
                '&response_type=id_token%20token' +
                '&scope=openid%20email%20profile' +
                '&nonce=nonce' +
                '&state=state' +
                '&testcustom=customvalue';

            expect(value).toEqual(expectValue);
        });

        it('createAuthorizeUrl with custom values', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';

            config.customParams = {
                t4: 'ABC abc 123',
                t3: '#',
                t2: '-_.!~*()',
                t1: ';,/?:@&=+$',
            };

            configurationProvider.setConfig(config, { authorizationEndpoint: 'http://example' });

            const value = (service as any).createAuthorizeUrl(
                '', // Implicit Flow
                config.redirectUrl,
                'nonce',
                'state'
            );

            const expectValue =
                'http://example?client_id=188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com' +
                '&redirect_uri=https%3A%2F%2Flocalhost%3A44386' +
                '&response_type=id_token%20token' +
                '&scope=openid%20email%20profile' +
                '&nonce=nonce' +
                '&state=state&t4=ABC%20abc%20123&t3=%23&t2=-_.!~*()&t1=%3B%2C%2F%3F%3A%40%26%3D%2B%24';

            expect(value).toEqual(expectValue);
        });

        it('createEndSessionUrl default', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';
            config.postLogoutRedirectUri = 'https://localhost:44386/Unauthorized';

            const endSessionEndpoint = 'http://example';
            configurationProvider.setConfig(config, { endSessionEndpoint } as AuthWellKnownEndpoints);

            const value = service.createEndSessionUrl('mytoken');

            const expectValue =
                'http://example?id_token_hint=mytoken&post_logout_redirect_uri=https%3A%2F%2Flocalhost%3A44386%2FUnauthorized';

            expect(value).toEqual(expectValue);
        });

        it('createAuthorizeUrl default', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';

            configurationProvider.setConfig(config, { authorizationEndpoint: 'http://example' });

            const value = (service as any).createAuthorizeUrl(
                '', // Implicit Flow
                config.redirectUrl,
                'nonce',
                'state'
            );

            const expectValue =
                'http://example?client_id=188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com' +
                '&redirect_uri=https%3A%2F%2Flocalhost%3A44386' +
                '&response_type=id_token%20token' +
                '&scope=openid%20email%20profile' +
                '&nonce=nonce' +
                '&state=state';

            expect(value).toEqual(expectValue);
        });

        // https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-reference-oidc
        it('createAuthorizeUrl with custom url like active-directory-b2c', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = 'myid';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';

            configurationProvider.setConfig(config, {
                authorizationEndpoint:
                    'https://login.microsoftonline.com/fabrikamb2c.onmicrosoft.com/oauth2/v2.0/authorize?p=b2c_1_sign_in',
            });

            const value = (service as any).createAuthorizeUrl(
                '', // Implicit Flow
                config.redirectUrl,
                'nonce',
                'state'
            );

            const expectValue =
                'https://login.microsoftonline.com/fabrikamb2c.onmicrosoft.com/oauth2/v2.0/authorize?p=b2c_1_sign_in' +
                '&client_id=myid' +
                '&redirect_uri=https%3A%2F%2Flocalhost%3A44386' +
                '&response_type=id_token%20token' +
                '&scope=openid%20email%20profile' +
                '&nonce=nonce' +
                '&state=state';

            expect(value).toEqual(expectValue);
        });

        it('createEndSessionUrl with azure-ad-b2c policy parameter', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = 'myid';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';
            config.postLogoutRedirectUri = 'https://localhost:44386/Unauthorized';

            const endSessionEndpoint = 'https://login.microsoftonline.com/fabrikamb2c.onmicrosoft.com/oauth2/v2.0/logout?p=b2c_1_sign_in';
            configurationProvider.setConfig(config, { endSessionEndpoint } as AuthWellKnownEndpoints);

            const value = service.createEndSessionUrl('UzI1NiIsImtpZCI6Il');

            const expectValue =
                'https://login.microsoftonline.com/fabrikamb2c.onmicrosoft.com/oauth2/v2.0/logout?p=b2c_1_sign_in' +
                '&id_token_hint=UzI1NiIsImtpZCI6Il' +
                '&post_logout_redirect_uri=https%3A%2F%2Flocalhost%3A44386%2FUnauthorized';

            expect(value).toEqual(expectValue);
        });

        it('createRevocationBody access_token default', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';
            config.postLogoutRedirectUri = 'https://localhost:44386/Unauthorized';

            const revocationEndpoint = 'http://example?cod=ddd';
            configurationProvider.setConfig(config, { revocationEndpoint } as AuthWellKnownEndpoints);

            const value = service.createRevocationEndpointBodyAccessToken('mytoken');
            const expectValue =
                'client_id=188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com&token=mytoken&token_type_hint=access_token';

            expect(value).toEqual(expectValue);
        });

        it('createRevocationBody refresh_token default', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';
            config.postLogoutRedirectUri = 'https://localhost:44386/Unauthorized';

            const revocationEndpoint = 'http://example?cod=ddd';
            configurationProvider.setConfig(config, { revocationEndpoint } as AuthWellKnownEndpoints);

            const value = service.createRevocationEndpointBodyRefreshToken('mytoken');
            const expectValue =
                'client_id=188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com&token=mytoken&token_type_hint=refresh_token';

            expect(value).toEqual(expectValue);
        });

        it('createRevocationUrl with params', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';
            config.postLogoutRedirectUri = 'https://localhost:44386/Unauthorized';

            const revocationEndpoint = 'http://example?cod=ddd';
            configurationProvider.setConfig(config, { revocationEndpoint } as AuthWellKnownEndpoints);

            const value = service.getRevocationEndpointUrl();

            const expectValue = 'http://example';

            expect(value).toEqual(expectValue);
        });

        it('createRevocationUrl default', () => {
            const config = { stsServer: 'https://localhost:5001' } as OpenIdConfiguration;
            config.redirectUrl = 'https://localhost:44386';
            config.clientId = '188968487735-b1hh7k87nkkh6vv84548sinju2kpr7gn.apps.googleusercontent.com';
            config.responseType = 'id_token token';
            config.scope = 'openid email profile';
            config.postLogoutRedirectUri = 'https://localhost:44386/Unauthorized';

            const revocationEndpoint = 'http://example';
            configurationProvider.setConfig(config, { revocationEndpoint } as AuthWellKnownEndpoints);

            const value = service.getRevocationEndpointUrl();

            const expectValue = 'http://example';

            expect(value).toEqual(expectValue);
        });
    });
});