package com.barprice;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    @GetMapping("/{barcode}")
    public ResponseEntity<?> getByBarcode(@PathVariable String barcode) throws ExecutionException, InterruptedException {
        log.info("Buscando barcode: [{}] longitud: {}", barcode, barcode.length());
        Firestore db = FirestoreClient.getFirestore();
        DocumentSnapshot doc = db.collection("products").document(barcode).get().get();
        if (!doc.exists()) {
            log.warn("No encontrado: [{}]", barcode);
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> data = doc.getData();
        data.put("barcode", barcode);
        log.info("Encontrado: {}", data.get("name"));
        return ResponseEntity.ok(data);
    }

    @GetMapping
    public ResponseEntity<?> getAll() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        var docs = db.collection("products").get().get().getDocuments();
        var list = docs.stream().map(d -> {
            Map<String, Object> data = d.getData();
            data.put("barcode", d.getId());
            return data;
        }).toList();
        return ResponseEntity.ok(list);
    }
}
