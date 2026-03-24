Workflow Test Plan                                           
                                                               
  ---                                                          
  Test 1 — Basic Video Generation (Prompt → Video)
                                                               
  Step 1. Click Prompt in the dock → node appears              
                                                               
  Step 2. Type in the prompt node:                             
  A young woman in a bright bathroom holds up a small glass    
  serum bottle,                                                
  smiles at the camera. Soft natural window light, close-up    
  selfie angle.
                                                               
  Step 3. Click Video in the dock → node appears            
                                                               
  Step 4. Drag from Prompt's right handle → Video's top-left   
  handle (prompt-input)
                                                               
  Step 5. On the Video node: keep Duration 8s, Model Veo 3.1   
   
  Step 6. Click Generate                                       
                                                            
  Step 7. Watch status change: idle → processing → completed   
   
  ✅ Pass: video plays inline in the node                      
  ❌ Fail: note the error message shown                     
                                                               
  ---                                                       
  Test 2 — Image-Guided Generation (Image + Prompt → Video)    
                                                            
  Step 1. Click Image in the dock
                                                               
  Step 2. Upload any photo (a face, a product bottle, anything)
                                                               
  Step 3. Click Video in the dock → new video node             
                                                            
  Step 4. Connect:                                             
  - Prompt node (from Test 1) right handle → new Video      
  prompt-input                                                 
  - Image node right handle → new Video image-input (second
  handle)                                                      
                                                               
  Step 5. Click Generate
                                                               
  ✅ Pass: video generated using the image as visual reference 
   
  ---                                                          
  Test 3 — Extend the Video                                 
                           
  Step 1. Click Extend in the dock → ExtensionNode appears
                                                               
  Step 2. Connect: completed VideoNode (Test 1) right handle → 
  Extend left handle                                           
                                                               
  Step 3. In the Extend node prompt field type:             
  She turns the bottle around to show the ingredients label,
  still smiling, natural handheld camera movement.          
                                                               
  Step 4. Click Extend                                         
                                                               
  ✅ Pass: extended clip generates and plays                   
  ❌ Common fail: "No veo_video_uri" — means the original video
   didn't save the Veo URI                                     
                                                            
  ---                                                          
  Test 4 — Second Video for Stitch                          
                                                               
  Step 1. Place a new Prompt node, type:
  Close-up of a serum bottle on a marble bathroom counter,     
  golden hour light, slow zoom in, cinematic product shot, no
  people.                                                      
                                                               
  Step 2. Place a new Video node, set Duration 5s              
                                                               
  Step 3. Connect new Prompt → new Video, click Generate    
                                                               
  ---                                                          
  Test 5 — Stitch
                                                               
  Step 1. Click Stitch in the dock → StitchNode appears     

  Step 2. Connect (in order):                                  
  - Video from Test 1 → StitchNode video-input-1
  - Video from Test 3 (extended) → StitchNode video-input-2    
  - Video from Test 4 → StitchNode video-input-3            
                                                               
  Step 3. Set:                                                 
  - Aspect Ratio: 9:16                                         
  - Transition 1→2: fade                                       
  - Transition 2→3: cut                                     
                                                               
  Step 4. Click Stitch Videos
                                                               
  ✅ Pass: merged video appears in StitchNode                  
                                                               
  ---                                                          
  Test 6 — Setting Node                                     

  Step 1. Click Setting in the dock

  Step 2. Configure:
  - Location: bathroom
  - Lighting: natural window                                   
  - Camera: selfie          
  - Vibe: clean minimal                                        
                                                            
  Step 3. Place a new Video node                               
                                                               
  Step 4. Connect: Prompt (Test 1) → Video prompt-input,       
  Setting → Video setting-input (5th handle)                   
                                                               
  Step 5. Click Generate                                    

  ✅ Pass: setting context injected, generation starts

  ---
  Test 7 — Scene Gallery
                        
  Step 1. Click Scene in the dock (film icon) → Scene Gallery
  panel opens                                                  
   
  Step 2. Verify 14 scenes are listed across Hooks / Body /    
  Closers tabs                                              
                                                               
  Step 3. Click "Curiosity Hook" → Scene node appears on canvas
   with pre-filled script:
  You won't believe what happened when I tried this...         
                                                            
  Step 4. Edit the script text to:
   
  Step 5. Click Generate inside the Scene node                 
                                                            
  ✅ Pass: video generates with scene prompt template applied  
                                                            
  ---
  Test 8 — Template Stamp
                                                               
  Step 1. Click Templates in the dock → Template Browser opens
                                                               
  Step 2. In System tab, click "Product Testimonial"           
   
  Step 3. Fill the variable fields:                            
  - Product name: GlowSerum Pro                             
  - Pain point: dry flaky skin                                 
                              
  Step 4. Click Use Template                                   
                                                               
  ✅ Pass: 4 Scene nodes appear on canvas pre-wired in sequence
   (Hook → Problem → Solution → CTA)                           
                                                               
  ---                                                       
  Test 9 — Hook Library
                       
  Step 1. Click Hooks (sparkles icon) in the dock
                                                               
  Step 2. Browse categories — Curiosity, Controversy, Social
  Proof, POV, etc.                                             
                                                            
  Step 3. Click a hook e.g.:                                   
  Nobody talks about this, but {product} just changed
  everything...                                                
                                                               
  Step 4. Verify it copies/inserts into a Prompt node
                                                               
  ✅ Pass: hook text lands in the canvas                    
                                                               
  ---                                                       
  Test 10 — Page Reload Persistence
                                                               
  Step 1. After completing Tests 1–5 with nodes on canvas
                                                               
  Step 2. Press F5 (hard refresh)                              
   
  Step 3. Verify all nodes and edges are restored exactly as   
  left                                                      
                                                               
  ✅ Pass: full canvas state restored from backend          
  ❌ Fail: nodes or edges missing after reload
                                                               
  ---
  Summary Checklist                                            
                                                            
  ┌──────┬─────────────────────┬───────────────────────────┐ 
  │ Test │       Feature       │         Expected          │   
  ├──────┼─────────────────────┼───────────────────────────┤ 
  │ 1    │ Prompt → Video      │ Video generates inline    │   
  ├──────┼─────────────────────┼───────────────────────────┤ 
  │ 2    │ Image + Prompt →    │ Image used as reference   │ 
  │      │ Video               │                           │   
  ├──────┼─────────────────────┼───────────────────────────┤ 
  │ 3    │ Extend              │ Continuation clip         │   
  │      │                     │ generates                 │ 
  ├──────┼─────────────────────┼───────────────────────────┤   
  │ 4    │ Second video        │ Independent generation    │ 
  ├──────┼─────────────────────┼───────────────────────────┤ 
  │ 5    │ Stitch              │ 3 clips merged into one   │
  ├──────┼─────────────────────┼───────────────────────────┤   
  │ 6    │ Setting node        │ Context injected into     │
  │      │                     │ prompt                    │   
  ├──────┼─────────────────────┼───────────────────────────┤
  │ 7    │ Scene Gallery       │ 14 scenes load, node      │
  │      │                     │ stamps                    │   
  ├──────┼─────────────────────┼───────────────────────────┤
  │ 8    │ Templates           │ 4-node graph stamps on    │   
  │      │                     │ canvas                    │   
  ├──────┼─────────────────────┼───────────────────────────┤
  │ 9    │ Hook Library        │ 15 hooks browsable        │   
  ├──────┼─────────────────────┼───────────────────────────┤   
  │ 10   │ Reload              │ All state persists        │
  └──────┴─────────────────────┴───────────────────────────┘