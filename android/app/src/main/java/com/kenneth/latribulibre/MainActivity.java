package com.kenneth.latribulibre;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TravelFtpPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
