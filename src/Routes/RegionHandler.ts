import { RequestHandler } from 'express';
import { Store } from '../Store';
import { IRegion, IHost, IEstate } from '../Types';
import { AuthenticatedRequest } from '../Auth';
import { Set } from 'immutable';
import { RegionLogs } from '../lib';

import { Response, GetRegionsResponse } from '../View/ClientStack';

import { RemoveRegionFromHost, PutRegionOnHost, StopRegion, KillRegion, StartRegion, RegionINI } from '../lib/Region';

export function GetRegionsHandler(store: Store): RequestHandler {
  return function (req: AuthenticatedRequest, res: Response) {
    store.Regions.getAll()
      .then((regions: IRegion[]) => {
        return regions.filter((r: IRegion) => {
          return req.user.regions.has(r.uuid);
        });
      }).then((regions: IRegion[]) => {
        res.json(<GetRegionsResponse>{
          Success: true,
          Regions: regions
        });
      }).catch((err: Error) => {
        res.json({
          Success: false,
          Message: err.message
        });
      });
  }
}

export function StartRegionHandler(store: Store): RequestHandler {
  return (req: AuthenticatedRequest, res) => {
    let regionID = req.params.regionID;
    let r: IRegion

    if (!req.user.isAdmin && !req.user.regions.has(regionID))
      return res.json({ Success: false, Message: 'Permission Denied' });

    store.Regions.getByUUID(regionID.toString()).then((region: IRegion) => {
      r = region;
      return store.Hosts.getByAddress(r.node);
    }).then((h: IHost) => {
      return StartRegion(r, h);
    }).then(() => {
      res.json({ Success: true });
    }).catch((err: Error) => {
      res.json({ Success: false, Message: err.message });
    })
  };
}


export function StopRegionHandler(store: Store): RequestHandler {
  return (req: AuthenticatedRequest, res) => {
    let regionID = req.params.uuid;
    let region: IRegion

    if (!req.user.isAdmin && !req.user.regions.has(regionID))
      return res.json({ Success: false, Message: 'Permission Denied' });

    store.Regions.getByUUID(regionID.toString()).then((r: IRegion) => {
      if (!r.isRunning) {
        throw new Error('Region ' + r.name + ' is not running');
      }
      if (!r.node) {
        throw new Error('Region ' + r.name + ' is marked as running, but is not assigned to a host');
      }
      region = r;
      return store.Hosts.getByAddress(r.node);
    }).then((h: IHost) => {
      return StopRegion(region, h);
    }).then(() => {
      res.json({ Success: true });
    }).catch((err) => {
      res.json({ Success: false, Message: err.message });
    });
  };
}

export function KillRegionHandler(store: Store): RequestHandler {
  return (req: AuthenticatedRequest, res) => {
    let regionID = req.params.uuid;
    let target: IRegion;

    if (!req.user.isAdmin && !req.user.regions.has(regionID))
      return res.json({ Success: false, Message: 'Permission Denied' });

    store.Regions.getByUUID(regionID.toString()).then((r: IRegion) => {
      if (!r.isRunning)
        throw new Error('Region ' + r.name + ' is not running');
      if (!r.node)
        throw new Error('Region ' + r.name + ' is marked as running, but is not assigned to a host');
      target = r;
      return store.Hosts.getByAddress(r.node);
    }).then((h: IHost) => {
      return KillRegion(target, h);
    }).then(() => {
      res.json({ Success: true });
    }).catch((err) => {
      res.json({ Success: false, Message: err.message });
    });
  };
}

export function GetRegionLogsHandler(store: Store, logger: RegionLogs): RequestHandler {
  return function (req: AuthenticatedRequest, res: Response) {
    let regionID = req.params.uuid;

    if (!req.user.isAdmin && !req.user.regions.has(regionID))
      return res.json({ Success: false, Message: 'Permission Denied' });

    store.Regions.getByUUID(regionID).then((r: IRegion) => {
      return logger.getLogs(r);
    }).then((log: string) => {
      res.json({
        Success: true,
        Message: log
      });
    }).catch((err: Error) => {
      res.json({ Success: false, Message: err.message });
    });
  }
}

export function SetRegionEstateHandler(store: Store): RequestHandler {
  return (req: AuthenticatedRequest, res) => {
    let regionID = req.params.uuid;
    let estateID: number = parseInt(req.body.estate);

    let estate: IEstate;

    if (!req.user.isAdmin && !req.user.regions.has(regionID))
      return res.json({ Success: false, Message: 'Permission Denied' });

    //confirm the components exist
    store.Estates.getById(estateID).then((e: IEstate) => {
      //confirmed
      estate = e;
      return store.Regions.getByUUID(regionID.toString());
    }).then((r: IRegion) => {
      //confirmed
       return store.Estates.setEstateForRegion(estate, r);
    }).then(() => {
      res.json({ Success: true });
    }).catch((err: Error) => {
      res.json({ Success: false, Message: err.message });
    });
  };
}

export function SetRegionCoordinatesHandler(store: Store): RequestHandler {
 return (req: AuthenticatedRequest, res) => {
    let regionID = req.params.uuid;
    let x = parseInt(req.body.x);
    let y = parseInt(req.body.y);

    if (!req.user.isAdmin && !req.user.regions.has(regionID))
      return res.json({ Success: false, Message: 'Permission Denied' });

    store.Regions.getAll().then((regions: IRegion[]) => {
      let region: IRegion;
      for (let r of regions) {
        if (r.x === x && r.y === y) throw new Error('Those coordinates are not available');
        if (r.uuid === regionID) region = r;
      }
      return region;
    }).then((r: IRegion) => {
      if (r.isRunning) throw new Error('Cannot move a region while it is running');
      return store.Regions.setXY(r, x, y);
    }).then(() => {
      res.json({ Success: true });
    }).catch((err: Error) => {
      res.json({ Success: false, Message: err.message });
    });
  };
}
/*
  router.post('/destroy/:uuid', isAdmin, (req: AuthenticatedRequest, res) => {
    let regionID = new UUIDString(req.params.uuid);

    db.Regions.getByUUID(regionID.toString()).then((r: RegionInstance) => {
      if (r.isRunning) {
        return res.json({ Success: false, Message: 'cannot delete a running region' });
      }
      if (r.slaveAddress !== null && r.slaveAddress !== '') {
        return res.json({ Success: false, Message: 'region is still allocated a host' });
      }
      return r.destroy();
    }).then(() => {
      res.json({ Success: true });
    }).catch((err: Error) => {
      res.json({ Success: false, Message: err.message });
    });
  });

  router.post('/create', isAdmin, (req: AuthenticatedRequest, res) => {
    let name = req.body.name;

    if(!req.body.x || isNaN(parseInt(req.body.x, 10))) return res.json({ Success: false, Message: "Integer X coordinate required" });
    if(!req.body.y || isNaN(parseInt(req.body.y, 10))) return res.json({ Success: false, Message: "Integer Y coordinate required" });
    if(!name) return res.json({ Success: false, Message: "Region name cannot be blank" });
    if(!req.body.estate || isNaN(parseInt(req.body.estate,10))) return res.json({ Success: false, Message: "Invalid Estate Assignment" });

    let estateID = parseInt(req.body.estate, 10);
    let x = parseInt(req.body.x, 10);
    let y = parseInt(req.body.y, 10);

    if(x < 0 || y < 0)
      return res.json({ Success: false, Message: "Invalid region coordinates" });

    let newRegion: RegionInstance;

    // confirm estate exists
    db.Estates.getEstateByID(estateID).then((e: EstateInstance) => {
      //confirmed. check for region name and location
      return db.Regions.getAll();
    }).then((regions: RegionInstance[]) => {
      for (let r of regions) {
        if (r.name === name) throw new Error('That region name is already taken');
        if (r.locX === x && r.locY === y) throw new Error('Those corrdinates are not available');
      }
    }).then(() => {
      return db.Regions.create(name, x, y);
    }).then((r: RegionInstance) => {
      newRegion = r;
      return db.Estates.setMapForRegion(estateID, r.uuid);
    }).then(() => {
      return res.json({ Success: true, Message: newRegion.uuid });
    }).catch((err: Error) => {
      res.json({ Success: false, Message: err.message });
      console.log(err);
    });
  });

  router.post('/host/:regionID', isAdmin, (req: AuthenticatedRequest, res) => {
    //moving a region to a new host

    //get region
    let regionID = new UUIDString(req.params.regionID);
    let hostAddress: string = req.body.host || '';
    let region: RegionInstance;
    let newHost: HostInstance;

    console.log('Setting host for region ' + regionID.toString() + ' to host: ' + hostAddress);

    db.Regions.getByUUID(regionID.toString()).then((r: RegionInstance) => {
      if (r.isRunning) {
        throw new Error('Region is currently running');
      }
      region = r;
      if (r.slaveAddress === hostAddress) {
        throw new Error('Region is already on that host');
      }
    }).then(() => {
      //get new host
      return new Promise<HostInstance>((resolve, reject) => {
        db.Hosts.getByAddress(hostAddress).then((h: HostInstance) => {
          resolve(h);
        }).catch(() => {
          resolve(null);
        })
      });
    }).then((h: HostInstance) => {
      newHost = h;

      //try to get region's current host
      return new Promise<HostInstance>((resolve, reject) => {
        db.Hosts.getByAddress(region.slaveAddress).then((h: HostInstance) => {
          resolve(h);
        }).catch(() => {
          resolve(null);
        })
      });
    }).then((fromHost: HostInstance) => {
      //if the old host does not exist, skip to the next step
      if (fromHost === null) {
        return Promise.resolve();
      }

      //try to remove the host, but we dont care if we fail
      return new Promise<void>((resolve, reject) => {
        RemoveRegionFromHost(region, fromHost).then(() => {
          resolve();
        }).catch(() => {
          resolve();
        });
      });
    }).then(() => {
      //we are removed from the old host
      return PutRegionOnHost(region, newHost);
    }).then(() => {
      res.json({ Success: true });
    }).catch((err: Error) => {
      res.json({ Success: false, Message: err.message });
    });
  });


}*/