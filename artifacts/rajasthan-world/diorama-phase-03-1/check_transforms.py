import bpy
scene = bpy.context.scene
vt_items = bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items
print("TRANSFORMS:", [e.identifier for e in vt_items])
scene.view_settings.view_transform = "AgX"
look_items = bpy.types.ColorManagedViewSettings.bl_rna.properties['look'].enum_items
print("LOOKS:", [e.identifier for e in look_items])
print("Done")
