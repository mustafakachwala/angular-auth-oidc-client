﻿import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { ConfigurationProvider } from '../config/config.provider';
import { LoggerService } from '../logging/logger.service';
import { EventTypes } from '../public-events/event-types';
import { PublicEventsService } from '../public-events/public-events.service';
import { StoragePersistanceService } from '../storage/storage-persistance.service';
import { AuthWellKnownEndpoints } from './auth-well-known-endpoints';
import { AuthWellKnownService } from './auth-well-known.service';
import { OpenIdConfiguration } from './openid-configuration';
import { PublicConfiguration } from './public-configuration';

@Injectable()
export class OidcConfigService {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly publicEventsService: PublicEventsService,
        private readonly configurationProvider: ConfigurationProvider,
        private readonly authWellKnownService: AuthWellKnownService,
        private storagePersistanceService: StoragePersistanceService
    ) {}

    withConfig(passedConfig: OpenIdConfiguration, passedAuthWellKnownEndpoints?: AuthWellKnownEndpoints): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!passedConfig.stsServer) {
                this.loggerService.logError('please provide at least an stsServer');
                return reject();
            }

            if (!passedConfig.authWellknownEndpoint) {
                passedConfig.authWellknownEndpoint = passedConfig.stsServer;
            }

            const usedConfig = this.configurationProvider.setConfig(passedConfig);

            const alreadyExistingAuthWellKnownEndpoints = this.storagePersistanceService.authWellKnownEndPoints;
            if (!!alreadyExistingAuthWellKnownEndpoints) {
                this.publicEventsService.fireEvent<PublicConfiguration>(EventTypes.ConfigLoaded, {
                    configuration: passedConfig,
                    wellknown: alreadyExistingAuthWellKnownEndpoints,
                });

                return resolve();
            }

            if (!!passedAuthWellKnownEndpoints) {
                this.storeWellKnownEndpoints(passedAuthWellKnownEndpoints);
                this.publicEventsService.fireEvent<PublicConfiguration>(EventTypes.ConfigLoaded, {
                    configuration: passedConfig,
                    wellknown: passedAuthWellKnownEndpoints,
                });

                return resolve();
            }

            if (usedConfig.eagerLoadAuthWellKnownEndpoints) {
                this.loadAndStoreAuthWellKnownEndPoints(usedConfig.authWellknownEndpoint)
                    .pipe(
                        tap((wellknownEndPoints) =>
                            this.publicEventsService.fireEvent<PublicConfiguration>(EventTypes.ConfigLoaded, {
                                configuration: passedConfig,
                                wellknown: wellknownEndPoints,
                            })
                        )
                    )
                    .subscribe(() => resolve());
            }

            resolve();
        });
    }

    storeWellKnownEndpoints(mappedWellKnownEndpoints: AuthWellKnownEndpoints) {
        this.storagePersistanceService.authWellKnownEndPoints = mappedWellKnownEndpoints;
    }

    private loadAndStoreAuthWellKnownEndPoints(authWellknownEndpoint: string) {
        return this.authWellKnownService
            .getWellKnownEndPointsFromUrl(authWellknownEndpoint)
            .pipe(tap((mappedWellKnownEndpoints) => this.storeWellKnownEndpoints(mappedWellKnownEndpoints)));
    }
}
