import { Component, OnInit, HostBinding } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ClrDatagridStateInterface } from '@clr/angular';
import { Title } from '@angular/platform-browser';
import { StationsService } from '../../services/stations.service';
import { IngameIdsService } from '../../services/ingameIds.service';
import { IStation } from './station.interface';
import { EBGSStationsWOHistory, IngameIdsSchema } from '../../typings';
import { debounceTime, switchMap } from 'rxjs/operators';

@Component({
    selector: 'app-station-list',
    templateUrl: './station-list.component.html',
})
export class StationListComponent implements OnInit {
    @HostBinding('class.content-area') contentArea = true;
    stationData: IStation[] = [];
    loading = true;
    stationToAdd: string;
    totalRecords = 0;
    private pageNumber = 1;
    private tableState: ClrDatagridStateInterface;
    stationForm = new FormGroup({
        stationName: new FormControl()
    });
    FDevIDs: IngameIdsSchema;
    constructor(
        private stationService: StationsService,
        private titleService: Title,
        private ingameIdsService: IngameIdsService
    ) {
        this.titleService.setTitle('Station Search - Elite BGS');
    }

    showStation(stations: EBGSStationsWOHistory) {
        this.totalRecords = stations.total;
        this.stationData = stations.docs.map(responseStation => {
            const id = responseStation._id;
            const name = responseStation.name;
            const type = this.FDevIDs.station[responseStation.type].name;
            const government = this.FDevIDs.government[responseStation.government].name;
            const allegiance = this.FDevIDs.superpower[responseStation.allegiance].name;
            const economy = this.FDevIDs.economy[responseStation.economy].name;
            const state = this.FDevIDs.state[responseStation.state].name;
            return <IStation>{
                id: id,
                name: name,
                type: type,
                government: government,
                allegiance: allegiance,
                economy: economy,
                state: state
            };
        });
    }

    refresh(tableState: ClrDatagridStateInterface) {
        let beginsWith = this.stationForm.value.stationName;
        this.tableState = tableState;
        this.loading = true;
        this.pageNumber = Math.ceil((tableState.page.to + 1) / tableState.page.size);

        if (!beginsWith) {
            beginsWith = '';
        }

        this.stationService
            .getStationsBegins(this.pageNumber.toString(), beginsWith)
            .subscribe(stations => this.showStation(stations));
        this.loading = false;
    }

    async ngOnInit() {
        this.FDevIDs = await this.ingameIdsService.getAllIds().toPromise();
        this.stationForm.valueChanges
            .pipe(debounceTime(300))
            .pipe(switchMap(value => {
                this.loading = true;
                this.pageNumber = Math.ceil((this.tableState.page.to + 1) / this.tableState.page.size);
                if (!value.stationName) {
                    value.stationName = '';
                }
                return this.stationService
                    .getStationsBegins(this.pageNumber.toString(), value.stationName)
            }))
            .subscribe(stations => {
                this.showStation(stations);
                this.loading = false;
            });
    }
}
