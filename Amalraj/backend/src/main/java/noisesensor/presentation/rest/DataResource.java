package noisesensor.presentation.rest;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import noisesensor.common.api.request.DataRequest;
import noisesensor.common.api.request.SubscribeRequest;
import noisesensor.domain.service.DailyAggregationService;
import noisesensor.domain.service.DataService;
import noisesensor.domain.service.DisplayService;
import noisesensor.presentation.other.SensorCommunityFetch;

import io.vertx.core.json.JsonObject;

@Path("/api")
public class DataResource {

    @Inject
    DisplayService displayService;

    @Inject
    DataService dataService;

    @Inject
    DailyAggregationService dailyAggregationService;
    
    @Inject
    SensorCommunityFetch sensorCommunityFetch;

    //@POST
    //@Path("/fetch/start")
    //@Produces(MediaType.TEXT_PLAIN)
    //public Response startFetch() {
    //    sensorCommunityFetch.scheduledFetchData();
    //    dailyAggregationService.scheduledDailyData();
    //    
    //    String result = "Scheduled fetching started";
    //    return Response.ok(result).build();
    //}

    @PUT
    @Path("/subscribe")
    @Produces(MediaType.APPLICATION_JSON)
    public Response registerSensor(SubscribeRequest request) {
        JsonObject response = dataService.registerSensor(request);
        return Response.ok(response).build();
    }

    @POST
    @Path("/data")
    @Produces(MediaType.TEXT_PLAIN)
    public Response receiveData(DataRequest dataRequest) {
        if (dataRequest.getSensor_id() == null || dataRequest.getLocation_id() == null) {
            return Response.status(400).entity("Missing uuid").build();
        }
        boolean response = dataService.receiveData(dataRequest);
        String result = (response) ? "Success" : "Fail";
        System.out.println(result);
        return Response.ok(response).build();
    }
}
