/*
 * KodeBlox Copyright 2021 Sayak Mukhopadhyay
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

module.exports = {
    _id: { type: "string" },
    __v: { type: "integer" },
    eddb_id: { type: "integer" },
    name: { type: "string" },
    name_lower: { type: "string" },
    type: { type: "string" },
    system: { type: "string" },
    system_lower: { type: "string" },
    government: { type: "string" },
    economy: { type: "string" },
    allegiance: { type: "string" },
    state: { type: "string" },
    distance_from_star: { type: "integer" },
    updated_at: { type: "string" },
    controlling_minor_faction: { type: "string" },
    services: {
        type: 'array',
        items: {
            $ref: '#/definitions/EBGSStationServicesV4'
        }
    },
    history: {
        type: 'array',
        items: {
            $ref: '#/definitions/EBGSStationHistoryV4'
        }
    }
}
