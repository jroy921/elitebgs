import { Component, OnInit, HostBinding, AfterViewInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ClrDatagridStateInterface, ClrDatagrid } from '@clr/angular';
import { Title } from '@angular/platform-browser';
import { SystemsService } from '../../services/systems.service';
import { ISystem } from './system.interface';
import { FDevIDs } from '../../utilities/fdevids';
import { EBGSSystemsWOHistory } from '../../typings';
import { debounceTime, switchMap } from 'rxjs/operators';
import { ThemeService } from '../../services/theme.service';

@Component({
    selector: 'app-system-list',
    templateUrl: './system-list.component.html',
})
export class SystemListComponent implements OnInit, AfterViewInit {
    @HostBinding('class.content-area') contentArea = true;
    @ViewChild(ClrDatagrid) datagrid: ClrDatagrid;
    systemData: ISystem[] = [];
    loading = true;
    systemToAdd: string;
    totalRecords = 0;
    private pageNumber = 1;
    private tableState: ClrDatagridStateInterface;
    systemForm = new FormGroup({
        systemName: new FormControl()
    });
    constructor(
        private systemService: SystemsService,
        private titleService: Title,
        private themeService: ThemeService
    ) {
        this.titleService.setTitle('System Search - Elite BGS');
    }

    ngAfterViewInit() {
        this.themeService.theme$.subscribe(() => {
            this.datagrid.resize();
        });
    }

    showSystem(systems: EBGSSystemsWOHistory) {
        this.totalRecords = systems.total;
        this.systemData = systems.docs.map(responseSystem => {
            const id = responseSystem._id;
            const name = responseSystem.name;
            const government = FDevIDs.government[responseSystem.government].name;
            const allegiance = FDevIDs.superpower[responseSystem.allegiance].name;
            const primary_economy = FDevIDs.economy[responseSystem.primary_economy].name;
            const secondary_economy = responseSystem.secondary_economy ? FDevIDs.economy[responseSystem.secondary_economy].name : '';
            const state = FDevIDs.state[responseSystem.state].name;
            return <ISystem>{
                id: id,
                name: name,
                government: government,
                allegiance: allegiance,
                primary_economy: primary_economy,
                secondary_economy: secondary_economy,
                state: state
            };
        });
    }

    refresh(tableState: ClrDatagridStateInterface) {
        let beginsWith = this.systemForm.value.systemName;
        this.tableState = tableState;
        this.loading = true;
        this.pageNumber = Math.ceil((tableState.page.to + 1) / tableState.page.size);

        if (!beginsWith) {
            beginsWith = '';
        }

        this.systemService
            .getSystemsBegins(this.pageNumber.toString(), beginsWith)
            .subscribe(systems => this.showSystem(systems));
        this.loading = false;
    }

    ngOnInit() {
        this.systemForm.valueChanges
            .pipe(debounceTime(300))
            .pipe(switchMap(value => {
                this.loading = true;
                this.pageNumber = Math.ceil((this.tableState.page.to + 1) / this.tableState.page.size);
                if (!value.systemName) {
                    value.systemName = '';
                }
                return this.systemService
                    .getSystemsBegins(this.pageNumber.toString(), value.systemName)
            }))
            .subscribe(systems => {
                this.showSystem(systems);
                this.loading = false;
            });
    }
}
