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
const mongoose = require('mongoose');
const cors = require('cors')
const _ = require('lodash');

const utilities = require('../../../modules/utilities');

let router = express.Router();
let ObjectId = mongoose.Types.ObjectId;
let recordsPerPage = 10;
let aggregateOptions = {
    maxTimeMS: 60000
}

/**
 * @swagger
 * /factions:
 *   get:
 *     description: Get the Factions
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         description: ID of the document.
 *         in: query
 *         type: string
 *       - name: eddbId
 *         description: EDDB ID of the faction.
 *         in: query
 *         type: string
 *       - name: name
 *         description: Faction name.
 *         in: query
 *         type: string
 *       - name: allegiance
 *         description: Name of the allegiance.
 *         in: query
 *         type: string
 *       - name: government
 *         description: Name of the government type.
 *         in: query
 *         type: string
 *       - name: beginswith
 *         description: Starting characters of the faction.
 *         in: query
 *         type: string
 *       - name: system
 *         description: Filter by system.
 *         in: query
 *         type: string
 *       - name: systemid
 *         description: Filter by system id.
 *         in: query
 *         type: string
 *       - name: filterSystemInHistory
 *         description: Apply the system filter in the history too.
 *         in: query
 *         type: boolean
 *       - name: activeState
 *         description: Name of the active state of the faction.
 *         in: query
 *         type: string
 *       - name: pendingState
 *         description: Name of the pending state of the faction.
 *         in: query
 *         type: string
 *       - name: recoveringState
 *         description: Name of the recovering state of the faction.
 *         in: query
 *         type: string
 *       - name: minimal
 *         description: Get minimal data of the faction.
 *         in: query
 *         type: boolean
 *       - name: systemDetails
 *         description: Get the detailed system data the faction currently is in.
 *         in: query
 *         type: boolean
 *       - name: timemin
 *         description: Minimum time for the faction history in miliseconds.
 *         in: query
 *         type: string
 *       - name: timemax
 *         description: Maximum time for the faction history in miliseconds.
 *         in: query
 *         type: string
 *       - name: count
 *         description: Number of history records per system presence. Disables timemin and timemax
 *         in: query
 *         type: string
 *       - name: page
 *         description: Page no of response.
 *         in: query
 *         type: integer
 *     responses:
 *       200:
 *         description: An array of factions with historical data
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/EBGSFactionsPageV4'
 */
router.get('/', cors(), async (req, res, next) => {
    try {
        let query = new Object;
        let page = 1;
        let history = false;
        let minimal = false;
        let greaterThanTime;
        let lesserThanTime;
        let count;

        if (req.query.id) {
            query._id = utilities.arrayOrNot(req.query.id, ObjectId);
        }
        if (req.query.eddbId) {
            query.eddb_id = utilities.arrayOrNot(req.query.eddbId, parseInt);
        }
        if (req.query.name) {
            query.name_lower = utilities.arrayOrNot(req.query.name, _.toLower);
        }
        if (req.query.allegiance) {
            query.allegiance = utilities.arrayOrNot(req.query.allegiance, _.toLower);
        }
        if (req.query.government) {
            query.government = utilities.arrayOrNot(req.query.government, _.toLower);
        }
        if (req.query.beginsWith) {
            query.name_lower = {
                $regex: new RegExp(`^${_.escapeRegExp(req.query.beginsWith.toLowerCase())}`)
            };
        }
        if (req.query.system) {
            query["faction_presence.system_name_lower"] = utilities.arrayOrNot(req.query.system, _.toLower);
        }
        if (req.query.systemid) {
            query["faction_presence.system_id"] = utilities.arrayOrNot(req.query.system, ObjectId);
        }
        if (req.query.activeState) {
            query["faction_presence"] = {
                $elemMatch: {
                    active_states: {
                        $elemMatch: {
                            state: utilities.arrayOrNot(req.query.activeState, _.toLower)
                        }
                    }
                }
            };
        }
        if (req.query.pendingState) {
            query["faction_presence"] = {
                $elemMatch: {
                    pending_states: {
                        $elemMatch: {
                            state: utilities.arrayOrNot(req.query.pendingState, _.toLower)
                        }
                    }
                }
            };
        }
        if (req.query.recoveringState) {
            query["faction_presence"] = {
                $elemMatch: {
                    recovering_states: {
                        $elemMatch: {
                            state: utilities.arrayOrNot(req.query.recoveringState, _.toLower)
                        }
                    }
                }
            };
        }
        if (req.query.minimal === 'true') {
            minimal = true;
        }
        if (req.query.page) {
            page = req.query.page;
        }
        if (req.query.timemin && req.query.timemax) {
            history = true;
            greaterThanTime = new Date(Number(req.query.timemin));
            lesserThanTime = new Date(Number(req.query.timemax));
        }
        if (req.query.timemin && !req.query.timemax) {
            history = true;
            greaterThanTime = new Date(Number(req.query.timemin));
            lesserThanTime = new Date(Number(+req.query.timemin + 604800000));      // Adding seven days worth of miliseconds
        }
        if (!req.query.timemin && req.query.timemax) {
            history = true;
            greaterThanTime = new Date(Number(+req.query.timemax - 604800000));     // Subtracting seven days worth of miliseconds
            lesserThanTime = new Date(Number(req.query.timemax));
        }
        if (req.query.count) {
            history = true
            count = +req.query.count
        }
        if (history) {
            let result = await getFactions(query, {
                greater: greaterThanTime,
                lesser: lesserThanTime,
                count: count
            }, minimal, page, req);
            res.status(200).json(result);
        } else {
            let result = await getFactions(query, {}, minimal, page, req);
            res.status(200).json(result);
        }
    } catch (err) {
        next(err);
    }
});

async function getFactions(query, history, minimal, page, request) {
    let factionModel = await require('../../../models/ebgs_factions_v5');
    let aggregate = factionModel.aggregate().option(aggregateOptions);
    aggregate.match(query).addFields({
        system_ids: {
            $map: {
                input: "$faction_presence",
                as: "system_info",
                in: "$$system_info.system_id"
            }
        }
    });

    let countAggregate = factionModel.aggregate().option(aggregateOptions);
    countAggregate.match(query);

    if (!_.isEmpty(history)) {
        if (minimal === 'true') {
            throw new Error("Minimal cannot work with History");
        }
        let lookupMatchAndArray = [{
            $eq: ["$faction_id", "$$id"]
        }];
        if (history.count) {
            if (request.query.system && request.query.filterSystemInHistory === 'true') {
                lookupMatchAndArray.push(query.faction_presence.system_name_lower);
            } else if (request.query.systemid && request.query.filterSystemInHistory === 'true') {
                lookupMatchAndArray.push(query.faction_presence.system_id);
            } else {
                lookupMatchAndArray.push({
                    $in: ["$system_id", "$$system_id"]
                });
            }
            aggregate.lookup({
                from: "ebgshistoryfactionv5",
                as: "history",
                let: { "id": "$_id", "system_id": "$system_ids" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: lookupMatchAndArray
                            }
                        }
                    },
                    {
                        $project: {
                            faction_id: 0,
                            faction_name: 0,
                            faction_name_lower: 0
                        }
                    },
                    {
                        $limit: history.count
                    }
                ]
            });
        } else {
            lookupMatchAndArray.push(
                {
                    $gte: ["$updated_at", new Date(history.greater)]
                },
                {
                    $lte: ["$updated_at", new Date(history.lesser)]
                }
            );
            if (request.query.system && request.query.filterSystemInHistory === 'true') {
                lookupMatchAndArray.push(query.faction_presence.system_name_lower);
            } else if (request.query.systemid && request.query.filterSystemInHistory === 'true') {
                lookupMatchAndArray.push(query.faction_presence.system_id);
            }
            aggregate.lookup({
                from: "ebgshistoryfactionv5",
                as: "history",
                let: { "id": "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: lookupMatchAndArray
                            }
                        }
                    },
                    {
                        $project: {
                            faction_id: 0,
                            faction_name: 0,
                            faction_name_lower: 0
                        }
                    }
                ]
            });
        }
    }

    let objectToMerge = {};

    if (request.query.systemDetails === 'true') {
        aggregate.lookup({
            from: "ebgssystemv5",
            as: "system_details",
            let: { "system_ids": "$system_ids" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $in: ["$_id", "$$system_ids"]
                        }
                    }
                }
            ]
        });
        objectToMerge["system_details"] = {
            $arrayElemAt: [
                {
                    $filter: {
                        input: "$system_details",
                        as: "system",
                        cond: {
                            $eq: ["$$system._id", "$$system_info.system_id"]
                        }
                    }
                },
                0
            ]
        };
    }

    aggregate.addFields({
        faction_presence: {
            $map: {
                input: "$faction_presence",
                as: "system_info",
                in: {
                    $mergeObjects: [
                        "$$system_info",
                        objectToMerge
                    ]
                }
            }
        }
    });

    if (minimal === 'true') {
        aggregate.project({
            faction_presence: 0
        });
    }

    aggregate.project({
        system_ids: 0,
        system_details: 0
    });

    if (_.isEmpty(query)) {
        throw new Error("Add at least 1 query parameter to limit traffic");
    }

    return factionModel.aggregatePaginate(aggregate, {
        page,
        countQuery: countAggregate,
        limit: recordsPerPage,
        customLabels: {
            totalDocs: "total",
            totalPages: "pages"
        }
    });
}

module.exports = router;