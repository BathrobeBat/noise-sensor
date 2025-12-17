package noisesensor.utils;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.text.SimpleDateFormat;
import java.util.Calendar;

@ApplicationScoped
public class Logger {
    @ConfigProperty(name="LOG_FILE")
    String logFile;
    @ConfigProperty(name="ERROR_LOG_FILE")
    String errorLogFile;

    private static final String RESET_TEXT = "\u001B[0m";
    private static final String RED_TEXT = "\u001B[31m";
    private static final String GREEN_TEXT = "\u001B[32m";

    private static String timestamp() {
        return new SimpleDateFormat("dd/MM/yy - HH:mm:ss")
                .format(Calendar.getInstance().getTime());
    }
    public void log(String message) {
        try {
            BufferedWriter writer = new BufferedWriter(new FileWriter(logFile, true));
            writer.write(GREEN_TEXT + " ["+timestamp()+"] " + message + " " + RESET_TEXT + "\n");

            writer.close();
        } catch (Exception e) {
            System.out.println(GREEN_TEXT + " ["+timestamp()+"] " + message + " " + RESET_TEXT + "\n");
        }
    }
    public void logError(String message){
       try {
            BufferedWriter writer = new BufferedWriter(new FileWriter(errorLogFile,true));
            writer.write(RED_TEXT + " ["+timestamp()+"] " + message + " " + RESET_TEXT + "\n");

            writer.close();
        } catch (Exception e) {
           System.err.println(RED_TEXT + " ["+timestamp()+"] " + message + " " + RESET_TEXT + "\n");
        }
    }
}
