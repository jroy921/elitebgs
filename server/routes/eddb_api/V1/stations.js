/*
 * KodeBlox Copyright 2017 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http: //www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

const express = require('express');
const passport = require('passport');
const bluePromise = require('bluebird');
const _ = require('lodash');

let router = express.Router();

router.get('/', passport.authenticate('basic', { session: false }), (req, res) => {
    require('../../../models/stations')
        .then(stations => {
            let query = new Object;
            let factionSearch = null;
            let systemSearch = null;

            if (req.query.name) {
                query.name_lower = req.query.name.toLowerCase();
            }
            if (req.query.ships) {
                let ships = arrayfy(req.query.ships);
                query['selling_ship.name_lower'] = { $all: ships };
            }
            if (req.query.moduleid) {
                let modules = arrayfy(req.query.moduleid);
                query.selling_modules = { $all: modules };
            }
            if (req.query.controllingfactionname) {
                factionSearch = new Promise((resolve, reject) => {
                    require('../../../models/factions')
                        .then(factions => {
                            let factionQuery = new Object;

                            factionQuery.name_lower = req.query.controllingfactionname.toLowerCase();

                            factions.find(factionQuery).lean()
                                .then(result => {
                                    let ids = [];
                                    result.forEach(doc => {
                                        ids.push(doc.id);
                                    }, this);
                                    resolve(ids);
                                })
                                .catch(err => {
                                    err.place = 'faction';
                                    reject(err);
                                });
                        })
                        .catch(err => {
                            err.place = 'faction';
                            reject(err);
                        });
                })
            }
            if (req.query.allegiancename) {
                query.allegiance = req.query.allegiancename.toLowerCase();
            }
            if (req.query.governmentname) {
                query.government = req.query.governmentname.toLowerCase();
            }
            if (req.query.minlandingpad) {
                switch (req.query.minlandingpad.toLowerCase()) {
                    case 'l': query.max_landing_pad_size = 'l';
                        break;
                    case 'm': query.max_landing_pad_size = { $in: ['m', 'l'] };
                        break;
                    case 's': query.max_landing_pad_size = { $in: ['s', 'm', 'l'] };
                        break;
                    default: query.max_landing_pad_size = { $in: ['s', 'm', 'l'] };
                }
            }
            if (req.query.distancestar) {
                query.distance_to_star = { $lt: req.query.distancestar };
            }
            if (req.query.facilities) {
                let facilities = arrayfy(req.query.facilities);
                facilities.forEach((facility) => {
                    switch (facility.toLowerCase()) {
                        case 'blackmarket': query.has_blackmarket = true;
                            break;
                        case 'market': query.has_market = true;
                            break;
                        case 'refuel': query.has_refuel = true;
                            break;
                        case 'repair': query.has_repair = true;
                            break;
                        case 'restock': query.has_rearm = true;
                            break;
                        case 'outfitting': query.has_outfitting = true;
                            break;
                        case 'shipyard': query.has_shipyard = true;
                            break;
                    }
                }, this);
            }
            if (req.query.commodities) {
                let commodities = arrayfy(req.query.commodities);
                query['export_commodities.name_lower'] = { $all: commodities };
            }
            if (req.query.stationtypename) {
                let types = arrayfy(req.query.stationtypename);
                query.type = { $in: types };
            }
            if (req.query.planetary) {
                query.is_planetary = boolify(req.query.planetary);
            }
            if (req.query.economyname) {
                query['economies.name_lower'] = req.query.economyname.toLowerCase();
            }
            if (req.query.permit || req.query.power || req.query.powerstatename) {
                systemSearch = new Promise((resolve, reject) => {
                    require('../../../models/systems')
                        .then(systems => {
                            let systemQuery = new Object;

                            if (req.query.permit) {
                                systemQuery.needs_permit = boolify(req.query.permit);
                            }
                            if (req.query.power) {
                                let powers = arrayfy(req.query.power);
                                systemQuery.power = { $in: powers };
                            }
                            if (req.query.powerstatename) {
                                let powerStates = arrayfy(req.query.powerstatename);
                                systemQuery.power_state = { $in: powerStates };
                            }

                            systems.find(systemQuery).lean()
                                .then(result => {
                                    let ids = [];
                                    result.forEach(doc => {
                                        ids.push(doc.id);
                                    }, this);
                                    resolve(ids);
                                })
                                .catch(err => {
                                    err.place = 'system';
                                    reject(err);
                                });
                        })
                        .catch(err => {
                            err.place = 'system';
                            reject(err);
                        });
                })
            }

            let stationSearch = () => {
                if (_.isEmpty(query) && req.user.clearance !== 0) {
                    throw new Error("Add at least 1 query parameter to limit traffic");
                }
                stations.find(query).lean()
                    .then(result => {
                        res.status(200).json(result);
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json(err);
                    })
            }

            if (factionSearch instanceof Promise && systemSearch instanceof Promise) {
                let searches = {
                    faction: factionSearch,
                    system: systemSearch
                };
                bluePromise.props(Object.keys(searches).reduce((promiseObject, key) => {
                    promiseObject[key] = searches[key].reflect();
                    return promiseObject;
                }, {})).then(searches => {
                    if (searches.faction.isFulfilled()) {
                        query.controlling_minor_faction_id = { $in: searches.faction.value() };
                    } else {
                        console.log(searches.faction.reason());
                    }
                    if (searches.system.isFulfilled()) {
                        query.system_id = { $in: searches.system.value() };
                    } else {
                        console.log(searches.system.reason());
                    }
                    stationSearch();
                })
            } else if (factionSearch instanceof Promise) {
                factionSearch
                    .then(ids => {
                        query.controlling_minor_faction_id = { $in: ids };
                        stationSearch();
                    })
                    .catch(err => {
                        console.log(err);
                        stationSearch();
                    });
            } else if (systemSearch instanceof Promise) {
                systemSearch
                    .then(ids => {
                        query.system_id = { $in: ids };
                        stationSearch();
                    })
                    .catch(err => {
                        console.log(err);
                        stationSearch();
                    });
            } else {
                stationSearch();
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json(err);
        });
});

let arrayfy = requestParam => {
    let regex = /\s*,\s*/;
    let mainArray = requestParam.split(regex);

    mainArray.forEach((element, index, allElements) => {
        allElements[index] = element.toLowerCase();
    }, this);

    return mainArray;
}

let boolify = requestParam => {
    if (requestParam.toLowerCase() === "true") {
        return true;
    } else if (requestParam.toLowerCase() === "false") {
        return false;
    } else {
        return false;
    }
}

module.exports = router;