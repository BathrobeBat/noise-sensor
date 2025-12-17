package noisesensor.presentation.rest;

import static noisesensor.errors.ErrorsCode.EXAMPLE_ERROR;

import java.sql.Connection;

import javax.sql.DataSource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api")
public class HelloWorldResource {

    @GET
    @Path("/hello")
    @Produces(MediaType.TEXT_PLAIN)
    public Response helloWorld() {
        return Response.ok("Hello World ").build();
    }

    @GET
    @Path("/error")
    @Produces(MediaType.APPLICATION_JSON)
    public Response error() {
        EXAMPLE_ERROR.throwException("This is an error");
        // This line will never be reached
        return Response.noContent().build();
    }

        @Inject
    DataSource dataSource;

    @GET
    @Path("/db")
    @Produces(MediaType.TEXT_PLAIN)
    public String checkConnection() {
        try (Connection conn = dataSource.getConnection()) {
            return "Connection OK: " + conn.getMetaData().getDatabaseProductName();
        } catch (Exception e) {
            return "Connection FAILED: " + e.getMessage();
        }
    }

}