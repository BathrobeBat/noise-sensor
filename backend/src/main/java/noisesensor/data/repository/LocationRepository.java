package noisesensor.data.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import noisesensor.data.model.LocationModel;

import java.util.UUID;

@ApplicationScoped
public class LocationRepository implements PanacheRepository<LocationModel> {
    public LocationModel findByUuid(UUID id){
        return find("id", id).firstResult();
    }

    public LocationModel findBySensorCommunityLocationId(Integer sensor_community_location_id){
        return find("sensor_community_location_id", sensor_community_location_id).firstResult();
    }
    
    public void deleteByUuid(UUID id){
        delete("id", id);
    }

    @Transactional
    public LocationModel createLocation(String country, Float latitude, Float longitude, Float altitude, Boolean indoor) {
        LocationModel location = new LocationModel();
        location.setCountry(country);
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        location.setAltitude(altitude);
        location.setIndoor(indoor);
        persist(location);
        return location;
    }

    @Transactional
    public LocationModel createLocation(String country, Integer sensorCommunityId, Float latitude, Float longitude, Float altitude, Boolean indoor) {
        LocationModel location = new LocationModel();
        location.setCountry(country);
        location.setSensor_community_location_id(sensorCommunityId);
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        location.setAltitude(altitude);
        location.setIndoor(indoor);
        persist(location);
        return location;
    }
}
